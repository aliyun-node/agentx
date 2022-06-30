'use strict';

const EventEmitter = require('events');
const debug = require('debug')('alinode_agent');
const WebSocket = require('ws');

class Connection extends EventEmitter {
  constructor(server) {
    super();
    this.ws = new WebSocket(server);
    debug('Connecting to ' + server + '...');
    this.handleEvents();
  }

  handleEvents() {
    this.ws.on('open', () => {
      debug('connected');
      this.emit('open');
    });

    this.ws.on('error', (err) => {
      this.emit('error', err);
    });

    this.ws.on('close', () => {
      debug('WebSocket closed.');
      this.emit('close');
    });

    this.ws.on('message', (data, flags) => {
      var message;
      try {
        message = JSON.parse(data);
      } catch (err) {
        debug('non-json message: ' + data + ', err: ' + err);
        return;
      }
      this.emit('message', message, flags);
    });
  }

  sendMessage(message) {
    var str = JSON.stringify(message);
    this.ws.send(str, (err) => {
      if (err) {
        debug('send message when connected not opened.');
        this.ws.close();
      }
    });
  }

  close() {
    this.ws.close();
  }
}

module.exports = Connection;
