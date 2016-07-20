'use strict';

var path = require('path');
var expect = require('expect.js');
var WebSocketServer = require('ws').Server;
var Agent = require('../lib/agent');

describe('/lib/agent', function () {
  it('new Agent should ok', function () {
    var config = {
      appid: 1,
      server: 'server',
      reconnectDelay: 1,
      unknown: 'hehe',
      logdir: '/tmp',
      cmddir: path.join(__dirname, 'cmddir')
    };
    var agent = new Agent(config);
    expect(agent.appid).to.be(1);
    expect(agent.server).to.be('ws://server/');
    expect(agent.reconnectDelay).to.be(1000);
    expect(agent.unknown).to.be(undefined);
  });

  var wss;
  before(function () {
    wss = new WebSocketServer({ port: 8990 });
    wss.on('connection', function connection(ws) {
      ws.on('message', function incoming(message) {
        console.log('received: %s', message);
        ws.close();
      });

      ws.send('{"hello":"world"}');
    });
  });

  after(function () {
    try {
      wss.close();
    } catch (ex) {
      console.log(ex);
    }
  });

  it('run should ok', function (done) {
    var agent = new Agent({
      server: 'localhost:8990',
      appid: 1,
      secret: '2',
      logdir: '/tmp/',
      cmddir: '/tmp/'
    });

    agent.run();
    done();
  });

  it('should not exit when run with libMode', function (done) {
    var agent = new Agent({
      libMode: true,
      server: 'localhost:8990',
      appid: 2,
      secret: '2',
      logdir: '/tmp/',
      cmddir: '/tmp/'
    });

    agent.run();
    // mock signature not exist
    agent.onMessage({
      signature: null,
      type: 'error',
      params: {
        error: 'mock error'
      }
    });
    // mock REG_NOK result
    var msg = {
      type: 'result',
      params: {
        result: 'REG_NOK'
      }
    };
    var signature = agent.signature(msg);
    msg.signature = signature;
    agent.onMessage(msg);

    // mock error type
    var msg2 = {
      type: 'error',
      params: {
        error: 'mock error type'
      }
    };
    var signature2 = agent.signature(msg2);
    msg2.signature = signature2;
    agent.onMessage(msg2);
    done();
  });
});
