'use strict';

var EventEmitter = require('events');
var util = require('util');
var debug = require('debug')('alinode_agent');
var WebSocket = require('ws');

var Connection = function (server) {
  EventEmitter.call(this);
  this.ws = new WebSocket(server);
  console.log('[%s] Connecting to ' + server + '...', Date());
  this.handleEvents();
};
util.inherits(Connection, EventEmitter);

Connection.prototype.handleEvents = function () {
  var that = this;
  this.ws.on('open', function () {
    debug('connected');
    that.emit('open');
  });

  this.ws.on('error', function (err) {
    that.emit('error', err);
  });

  this.ws.on('close', function () {
    debug('WebSocket closed.');
    that.emit('close');
  });

  this.ws.on('message', function (data, flags) {
    var message;
    try {
      message = JSON.parse(data);
    } catch (err) {
      debug('non-json message: ' + data + ', err: ' + err);
      return;
    }
    that.emit('message', message, flags);
  });
};

Connection.prototype.sendMessage = function (message) {
  var that = this;
  var str = JSON.stringify(message);
  that.ws.send(str, function (err) {
    if (err) {
      debug('send message when connected not opened.');
      that.ws.close();
    }
  });
};

Connection.prototype.close = function () {
  this.ws.close();
};

module.exports = Connection;
