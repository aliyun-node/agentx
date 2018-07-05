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
    this.connectTimer = null;
    this.heartbeatMissCount = 0;
    this.heartbeatTimer = null;
    this.registerTimer = null;
    this.heartbeatInterval = config.heartbeatInterval * 1000;
    this.reconnectDelay = config.reconnectDelay * 1000;
    this.reportInterval = config.reportInterval * 1000;
    if (this.reportInterval < 60000) {
      throw new Error('report interval should not less than 60s');
    }
    this.config = config;
    this.handleMonitor();
  }

  run() {
    this.conn = new Connection(this.server);
    this.connectTimer = setTimeout(() => {
      if (this.conn.ws && this.conn.ws._socket && this.conn.ws._socket.destroy) {
        if (typeof this.conn.ws._socket.destroy === 'function') {
          this.conn.ws._socket.destroy();
        }
      }
      this.run();
    }, 10 * 1000);
    this.handleConnection();
  }

  handleConnection() {
    this.conn.on('open', () => {
      this.onOpen();
    });
    this.conn.on('message', (data) => {
      this.onMessage(data);
    });
    this.conn.on('error', (err) => {
      this.onError(err);
    });
    this.conn.on('close', () => {
      this.onClose();
    });
  }

  onOpen() {
    clearTimeout(this.connectTimer);
    this.sendRegisterMessage();
    this.state = AgentState.REGISTERING;
    this.registerTimer = setInterval(() => {
      // 3s后没有成功，继续发
      if (this.state === AgentState.REGISTERING) {
        this.sendRegisterMessage();
      }
    }, 5000);
  }

  onClose() {
    debug('connection closed');
    this.teardown();
    this.reconnect();
  }

  onError(err) {
    debug('get an error: %s', err);
    this.teardown();
    this.reconnect();
  }

  signature(message) {
    return utils.sha1(JSON.stringify(message), this.secret);
  }

  sendRegisterMessage() {
    debug('send register message');
    var params = {
      version: AGENT_VERSION,
      agentid: utils.getTagedAgentID(this.agentidMode),
      pid: process.pid
    };

    var message = {
      type: 'register',
      params: params,
      appid: this.appid,
      id: utils.uid()
    };

    this.sendMessage(message);
  }

  sendMessage(message) {
    var signature = this.signature(message);
    message.signature = signature;
    debug('>>>>>>>>>>>send message to server: %j', message);
    this.conn.sendMessage(message);
  }

  reconnect() {
    var delay = utils.random(0, this.reconnectDelay);
    debug('Try to connect after %ss.', delay / 1000);
    setTimeout(() => {
      // delay and retry
      this.run();
    }, delay);
  }

  teardown() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    if (this.registerTimer) {
      clearInterval(this.registerTimer);
    }

    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
    }

    this.state = AgentState.CLOSED;
    this.conn.close();
  }

  onMessage(message) {
    debug('<<<<<<<<<<<<<<<<<<<<<<receive message from server: %j\n', message);
    var type = message.type;
    var params = message.params || {};
    var signature = message.signature;
    var err;
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
          process.send({type: 'suicide'});
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
        debug('register ok.');
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
          process.send({type: 'suicide'});
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
        process.send({type: 'suicide'});
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
    var params = {interval: this.heartbeatInterval};
    var message = {
      type: 'heartbeat',
      params: params,
      appid: this.appid,
      id: id
    };

    this.sendMessage(message);
  }

  sendResultMessage(id, err, stdout, stderr) {
    debug('send result message. id: %s', id);
    var params = {};
    if (err) {
      params.error = err.message;
    } else {
      params.stdout = stdout;
      params.stderr = stderr;
    }

    var message = {
      type: 'result',
      params: params,
      appid: this.appid,
      id: id
    };

    this.sendMessage(message);
  }

  startHeartbeat() {
    var id = 100;
    this.heartbeatMissCount = 0;

    if (this.heartbeatTimer) {
      // 如果有重复的REG_OK,确保只有timer启动.
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.heartbeatMissCount >= 3) {
        debug('heartbeat missed %d times.', this.heartbeatMissCount);
        this.teardown();
        return;
      }

      if (this.state === AgentState.WORK) {
        this.sendHeartbeatMessage(id++);
        this.heartbeatMissCount++;
      }
    }, this.heartbeatInterval);
  }

  execCommand(params, id) {
    var command = params.command;
    var opts = {
      timeout: params.timeout,
      env: Object.assign({
        logdir: this.config.logdir
      }, process.env, params.env)
    };
    debug('execute command: %s, id: %s', command, id);
    // TODO: 太暴力了，需要个简单的词法分析来精确判断
    if (command.indexOf('|') !== -1 || command.indexOf('>') !== -1 ||
      command.indexOf('&') !== -1) {
      this.sendResultMessage(id, new Error('命令行包含非法字符'));
      return;
    }
    var parts = command.split(' ');
    var cmd = parts[0];
    var args = parts.slice(1);

    var file = path.join(this.prefix, cmd);
    fs.access(file, fs.X_OK, (err) => {
      if (err) {
        debug('no such file: %s', file);
        this.sendResultMessage(id, new Error('No such file'));
        return;
      }
      utils.execCommand(file, args, opts, (err, stdout, stderr) => {
        this.sendResultMessage(id, err, stdout, stderr);
      });
    });
  }

  handleMonitor() {
    var orders = fs.readdirSync(path.join(__dirname, 'orders'));
    orders.forEach((name) => {
      var order = require(path.join(__dirname, 'orders', name));
      if (typeof order.init === 'function') {
        order.init(this.config);
      }
      setInterval(() => {
        if (this.state === AgentState.WORK) { // 未连接时忽略执行
          order.run((err, params) => {
            if (err) {
              this.logger.info(utils.formatError(err));
              this.logger.error(err);
              return;
            }
            if (params) { // 忽略空数据
              this.sendMessage({
                type: 'log',
                params: params,
                appid: this.appid,
                agentid: utils.getTagedAgentID(this.agentidMode),
                timestamp: Date.now(),
                id: utils.uid()
              });
            }
          });
        }
      }, order.reportInterval || this.reportInterval);
    });
  }
}

module.exports = Agent;
