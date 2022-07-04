'use strict';

const fs = require('fs');
const path = require('path');

const utils = require('./utils');
const debug = require('debug')('alinode_agent');

const Connection = require('./connection');
const packageInfo = require('../package.json');
const AGENT_VERSION = packageInfo.version;

const AgentState = {
  WORK: 'work',
  CLOSED: 'closed',
  REGISTERING: 'registering'
};

class Agent {
  constructor(config) {
    this.logger = config.logger || console;
    // 是否以 lib 模式被使用，如果是，则不主动调用 process.exit
    this.libMode = config.libMode === true;
    this.conn = null;
    if (config.server.indexOf('wss://') === 0) {
      this.server = config.server;
    } else if (config.server.indexOf('agentserver.node.aliyun.com') === 0) {
      this.server = 'wss://' + config.server + '/';
    } else {
      this.server = 'ws://' + config.server + '/';
    }
    this.appid = '' + config.appid; // make sure it's a string
    this.secret = config.secret;
    this.agentidMode = config.agentidMode;
    this.logLevel = config.logLevel;
    this.prefix = config.cmddir;
    this.state = null;
    this.heartbeatMissCount = 0;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.registerTimer = null;
    this.monitorIntervalList = [];
    this.heartbeatInterval = config.heartbeatInterval * 1000;
    this.reconnectDelayBase = config.reconnectDelayBase || 3;
    this.reconnectDelay = config.reconnectDelay * 1000;
    this.reportInterval = config.reportInterval * 1000;
    this.registerRetryDelay = 5000;
    this.notReconnect = false;
    this.connectSockets = 0;
    if (this.reportInterval < 60000) {
      throw new Error('report interval should not less than 60s');
    }
    this.config = config;
    this.handleMonitor();
  }

  run() {
    this.conn = new Connection(this.server);
    this.handleConnection();
    ++this.connectSockets;
  }

  handleConnection() {
    const that = this;
    const conn = this.conn;
    let cleanup;

    const onerror = function (err) {
      cleanup();
      that.onError(err);
    };

    const onclose = function () {
      cleanup();
      that.onClose();
    };

    cleanup = function () {
      conn.removeListener('error', onerror);
      conn.removeListener('close', onclose);
    };

    conn.on('open', function () {
      that.onOpen();
    });
    conn.on('message', function (data) {
      that.onMessage(data);
    });
    conn.on('error', onerror);
    conn.on('close', onclose);
  }

  onOpen() {
    this.sendRegisterMessage();
    this.state = AgentState.REGISTERING;
    const that = this;
    this.registerTimer = setInterval(function () {
      // 3s后没有成功，继续发
      if (that.state === AgentState.REGISTERING) {
        that.sendRegisterMessage();
      }
    }, this.registerRetryDelay);
  }

  onClose() {
    console.log('[%s] connection closed', Date());
    this.reconnect();
  }

  onError(err) {
    console.log('[%s] get an error: %s', Date(), err);
    this.reconnect();
  }

  signature(message) {
    return utils.sha1(JSON.stringify(message), this.secret);
  }

  sendRegisterMessage() {
    debug('send register message');
    const params = {
      version: AGENT_VERSION,
      agentid: utils.getTagedAgentID(this.agentidMode),
      pid: process.pid
    };

    const message = {
      type: 'register',
      params: params,
      appid: this.appid,
      id: utils.uid()
    };

    this.sendMessage(message);
  }

  sendMessage(message) {
    const signature = this.signature(message);
    message.signature = signature;
    debug('>>>>>>>>>>>send message to server: %j', message);
    if (this.conn && typeof this.conn.sendMessage === 'function') {
      this.conn.sendMessage(message);
    }
  }

  reconnect() {
    if (this.notReconnect) {
      return;
    }
    this.teardown();
    const that = this;
    // delay 3 - 10s
    const delay = utils.random(this.reconnectDelayBase, this.reconnectDelay);
    debug('Try to connect after %ss.', delay / 1000);
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(function () {
      // delay and retry
      that.run();
    }, delay);
  }

  teardown() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    if (this.registerTimer) {
      clearInterval(this.registerTimer);
    }

    this.state = AgentState.CLOSED;
    if (this.conn) {
      --this.connectSockets;
      this.conn.close();
      this.conn = null;
    }
  }

  onMessage(message) {
    debug('<<<<<<<<<<<<<<<<<<<<<<receive message from server: %j\n', message);
    const type = message.type;
    const params = message.params || {};
    const signature = message.signature;
    let err;
    // 如果server返回错误,不带签名,说明agent发注册消息的时候签名验证失败
    if (!signature) {
      if (type === 'error') {
        if (this.libMode) {
          this.logger.info('[agentx] signature error: %s', params.error);
          err = new Error(String(params.error || 'signature unknow error'));
          err.name = 'AlinodeAgentxSignatureError';
          this.logger.error(err);
        } else {
          this.logger.info('[agentx] signature error: %s, process exit~~~~~', params.error);
          process.send({ type: 'suicide' });
          process.exit(-3);
        }
        return;
      }
    }

    // 删除签名，重新计算
    delete message.signature;

    if (signature !== this.signature(message)) {
      debug('签名错误，忽略。message id: %s, %j', message.id, message);
      return;
    }

    switch (type) {
    case 'result':  //register and heartbeat ack
      if (params.result === 'REG_OK') {
        console.log('[%s] agent register ok.', Date());
        this.state = AgentState.WORK;
        this.stopRegister();
        this.startHeartbeat();
      } else if (params.result.substr(0, 7) === 'REG_NOK') {
        this.stopRegister();
        if (this.libMode) {
          this.logger.info('[agentx] register failed: %s, stop now.', params.result);
          err = new Error('agentx register failed: ' + params.result);
          err.name = 'AlinodeAgentxRegisterError';
          this.logger.error(err);
        } else {
          this.logger.info('[agentx] register failed: %s, process exit.', params.result);
          process.send({ type: 'suicide' });
          process.exit(-2);
        }
      } else if (params.result === 'HEARTBEAT_ACK') {
        this.heartbeatMissCount = 0;
      }
      break;

    case 'command':
      this.execCommand(params, message.id);
      break;

    case 'error':
      if (this.libMode) {
        this.logger.info('[agentx] get error message: %s', params.error);
        err = new Error(String(params.error || 'unknow error message'));
        err.name = 'AlinodeAgentxMessageError';
        this.logger.error(err);
      } else {
        this.logger.info('[agentx] %s, process exit~', params.error);
        process.send({ type: 'suicide' });
        process.exit(-1);
      }
      break;

    default:
      debug('message type: %s not supported', type);
      break;
    }
  }

  stopRegister() {
    clearInterval(this.registerTimer);
    this.registerTimer = null;
  }

  sendHeartbeatMessage(id) {
    debug('send heartbeat message. id: %s', id);
    const params = { interval: this.heartbeatInterval };
    const message = {
      type: 'heartbeat',
      params: params,
      appid: this.appid,
      id: id
    };

    this.sendMessage(message);
  }

  sendResultMessage(id, err, stdout, stderr) {
    debug('send result message. id: %s', id);
    const params = {};
    if (err) {
      params.error = err.message;
    } else {
      params.stdout = stdout;
      params.stderr = stderr;
    }

    const message = {
      type: 'result',
      params: params,
      appid: this.appid,
      id: id
    };

    this.sendMessage(message);
  }

  startHeartbeat() {
    let id = 100;
    this.heartbeatMissCount = 0;
    const that = this;

    if (this.heartbeatTimer) {
      // 如果有重复的REG_OK,确保只有timer启动.
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(function () {
      if (that.heartbeatMissCount >= 3) {
        debug('heartbeat missed %d times.', that.heartbeatMissCount);
        that.reconnect();
        return;
      }
      if (that.state === AgentState.WORK) {
        that.sendHeartbeatMessage(id++);
        that.heartbeatMissCount++;
      }
    }, this.heartbeatInterval);
  }

  execCommand(params, id) {
    const command = params.command;
    const opts = {
      timeout: params.timeout,
      env: {
        logdir: this.config.logdir,
        agentid: utils.getTagedAgentID(this.agentidMode),
        ...process.env,
        ...params.env
      }
    };
    debug('execute command: %s, id: %s', command, id);
    const that = this;
    // TODO: 太暴力了，需要个简单的词法分析来精确判断
    if (command.indexOf('|') !== -1 || command.indexOf('>') !== -1 ||
      command.indexOf('&') !== -1) {
      that.sendResultMessage(id, new Error('命令行包含非法字符'));
      return;
    }
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    const file = path.join(this.prefix, cmd);
    fs.access(file, fs.X_OK, function (err) {
      if (err) {
        debug('no such file: %s', file);
        that.sendResultMessage(id, new Error('No such file'));
        return;
      }
      utils.execCommand(file, args, opts, function (err, stdout, stderr) {
        that.sendResultMessage(id, err, stdout, stderr);
      });
    });
  }

  handleMonitor() {
    const that = this;
    const orders = fs.readdirSync(path.join(__dirname, 'orders'));
    orders.forEach(function (name) {
      const order = require(path.join(__dirname, 'orders', name));
      if (typeof order.init === 'function') {
        order.init(that.config);
      }
      const interval = setInterval(function () {
        if (that.state === AgentState.WORK) { // 未连接时忽略执行
          order.run(function (err, params) {
            if (err) {
              that.logger.info(utils.formatError(err));
              that.logger.error(err);
              return;
            }
            // ignore null
            if (!params) {
              return;
            }

            // ignore empty array
            if (Array.isArray(params) && params.length === 0) {
              return;
            }

            that.sendMessage({
              type: 'log',
              params: params,
              appid: that.appid,
              agentid: utils.getTagedAgentID(that.agentidMode),
              timestamp: new Date().getTime(),
              id: utils.uid()
            });
          });
        }
      }, order.reportInterval || that.reportInterval);
      that.monitorIntervalList.push(interval);
    });
  }
}

module.exports = Agent;
