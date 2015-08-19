'use strict';

var os = require('os');
var fs = require('fs');
var path = require('path');

var utils = require('./utils');
var debug = require('debug')('alinode_agent');

var Connection = require('./connection');
var packageInfo = require('../package.json');
var AGENT_VERSION = packageInfo.version;

var Agent = function (config) {
  this.conn = null;
  this.server = 'ws://' + config.server + '/';
  this.appid = config.appid;
  this.secret = config.secret;
  this.logLevel = config.logLevel;
  this.prefix = config.cmddir;
  this.state = null;
  this.heartbeatMissCount = 0;
  this.heartbeatTimer = null;
  this.registerTimer = null;
  this.heartbeatInterval = config.heartbeatInterval * 1000;
  this.reconnectDelay = config.reconnectDelay * 1000;
  this.logdir = config.logdir;
  this.reportInterval = config.reportInterval * 1000;
  if (this.reportInterval < 60000) {
    throw new Error("report interval should not less than 60s");
  }
};

var AgentState = {
  WORK: 'work',
  CLOSED: 'closed',
  REGISTERING: 'registering',
};

Agent.prototype.run = function () {
  this.conn = new Connection(this.server);
  this.handleConnection();
  this.handleMonitor();
};

Agent.prototype.handleConnection = function () {
  var that = this;
  this.conn.on('open', function () {
    that.onOpen();
  });
  this.conn.on('message', function (data, flags) {
    that.onMessage(data);
  });
  this.conn.on('error', function (err) {
    that.onError(err);
  });
  this.conn.on('close', function () {
    that.onClose();
  });
};

Agent.prototype.onOpen = function () {
  this.sendRegisterMessage();
  this.state = AgentState.REGISTERING;
  var that = this;
  this.registerTimer = setInterval(function () {
    // 3s后没有成功，继续发
    if (that.state === AgentState.REGISTERING) {
      that.sendRegisterMessage();
    }
  }, 5000);
};

Agent.prototype.onClose = function () {
  debug('connection closed');
  this.state = AgentState.CLOSED;
  this.reconnect();
};

Agent.prototype.onError = function (err) {
  debug('get an error: %s', err);
  this.state = AgentState.CLOSED;
  this.reconnect();
};

Agent.prototype.signature = function (message) {
  return utils.sha1(JSON.stringify(message), this.secret);
};

Agent.prototype.sendRegisterMessage = function () {
  debug("send register message");
  var params = {
    version: AGENT_VERSION,
    agentid: os.hostname()
  };

  var message = {
    type: 'register',
    params: params,
    appid: this.appid,
    id: utils.uid()
  };

  this.sendMessage(message);
};

Agent.prototype.sendMessage = function (message) {
  var signature = this.signature(message);
  message.signature = signature;
  debug('>>>>>>>>>>>send message to server: %j', message);
  this.conn.sendMessage(message);
};

Agent.prototype.reconnect = function () {
  var that = this;
  var delay = utils.random(0, this.reconnectDelay);
  debug('Try to connect after %ss.', delay / 1000);
  setTimeout(function() {
    // delay and retry
    that.run();
  }, delay);
};

Agent.prototype.teardown = function () {
  if (this.heartbeatTimer) {
    clearInterval(this.heartbeatTimer);
  }

  if (this.registerTimer) {
    clearInterval(this.registerTimer);
  }
  this.conn.close();
};

Agent.prototype.onMessage = function (message) {
  debug('<<<<<<<<<<<<<<<<<<<<<<receive message from server: %j\n', message);
  var type = message.type;
  var params = message.params;
  var signature = message.signature;
  // 如果server返回错误,不带签名,说明agent发注册消息的时候签名验证失败
  if (!signature) {
    if (type === 'error') {
      console.log(params.error, 'process exit~~~~~');
      process.send({type: 'suicide'});
      process.exit(-3);
    }
  }

  // 删除签名，重新计算
  delete message.signature;

  if (signature !== this.signature(message)) {
    debug("签名错误，忽略。message id: %s", message.id);
    return;
  }

  switch (type) {
  case 'result':  //register and heartbeat ack
    if (params.result === 'REG_OK') {
      debug("register ok.");
      this.state = AgentState.WORK;
      this.stopRegister();
      this.startHeartbeat();
    } else if (params.result.substr(0, 7) === 'REG_NOK') {
      this.stopRegister();
      console.log('register failed, process exit.');
      process.send({type: 'suicide'});
      process.exit(-2);
    } else if (params.result === 'HEARTBEAT_ACK') {
      this.heartbeatMissCount = 0;
    }
    break;

  case 'command':
    this.execCommand(params, message.id);
    break;

  case 'error':
    console.log(params.error, 'process exit~');
    process.send({type: 'suicide'});
    process.exit(-1);
    break;

  default:
    debug('message type: %s not supported', type);
    break;
  }
};

Agent.prototype.stopRegister = function () {
  clearInterval(this.registerTimer);
  this.registerTimer = null;
};

Agent.prototype.sendHeartbeatMessage = function (id) {
  debug("send heartbeat message. id: %s", id);
  var params = {interval: this.heartbeatInterval};
  var message = {
    type: 'heartbeat',
    params: params,
    appid: this.appid,
    id: id
  };

  this.sendMessage(message);
};

Agent.prototype.sendResultMessage = function (id, err, stdout, stderr) {
  debug("send result message. id: %s", id);
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
};

Agent.prototype.startHeartbeat = function () {
  var id = 100;
  this.heartbeatMissCount = 0;
  var that = this;

  if (this.heartbeatTimer) {
    // 如果有重复的REG_OK,确保只有timer启动.
    clearInterval(this.heartbeatTimer);
  }

  this.heartbeatTimer = setInterval(function() {
    if (that.heartbeatMissCount >= 3) {
      debug('heartbeat missed %d times.', that.heartbeatMissCount);
      that.conn.close();
      return;
    }

    if (that.state === AgentState.WORK) {
      that.sendHeartbeatMessage(id++);
      that.heartbeatMissCount++;
    }
  }, this.heartbeatInterval);
};

Agent.prototype.execCommand = function (params, id) {
  var command = params.command;
  var opts = {
    timeout: params.timeout
  };
  debug('execute command: %s, id: %s', command, id);
  var that = this;
  // TODO: 太暴力了，需要个简单的词法分析来精确判断
  if (command.indexOf("|") !== -1 || command.indexOf("&") !== -1) {
    that.sendResultMessage(id, new Error("命令行包含非法字符"));
    return;
  }
  var parts = command.split(" ");
  var cmd = parts[0];
  var args = parts.slice(1);

  var file = path.join(this.prefix, cmd);
  fs.access(file, fs.X_OK, function (err) {
    if (err) {
      debug('no such file: %s', file);
      that.sendResultMessage(id, new Error("No such file"));
      return;
    }
    utils.execCommand(file, args, opts, function (err, stdout, stderr) {
      that.sendResultMessage(id, err, stdout, stderr);
    });
  });
};

Agent.prototype.handleMonitor = function () {
  var that = this;
  var orders = fs.readdirSync(path.join(__dirname, 'orders'));
  orders.forEach(function (name) {
    var order = require(path.join(__dirname, 'orders', name));
    if (typeof order.init === 'function') {
      order.init(that.logdir);
    }
    var latestReport = new Date().getTime();
    setInterval(function () {
      var current = new Date().getTime();
      if (current - latestReport < 60 * 1000) {
        // ignore
        return;
      }
      if (that.state === AgentState.WORK) {
        latestReport = new Date();
        order.run(function (err, params) {
          var message = {
            type: 'log',
            params: params,
            appid: that.appid,
            agentid: os.hostname(),
            timestamp: new Date().getTime(),
            id: utils.uid()
          };
          that.sendMessage(message);
        });
      }
    }, that.reportInterval);
  });
};

module.exports = Agent;
