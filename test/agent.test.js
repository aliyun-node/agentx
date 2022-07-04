'use strict';

const path = require('path');
const expect = require('expect.js');
const WebSocketServer = require('ws').Server;
const Agent = require('../lib/agent');
const utils = require('../lib/utils');
const helper = require('./helper');
const mm = require('mm');

describe('/lib/agent', function () {
  it('new Agent should ok', function () {
    const config = {
      appid: 1,
      server: 'server',
      reconnectDelay: 1,
      unknown: 'hehe',
      logdir: '/tmp',
      cmddir: path.join(__dirname, 'cmddir')
    };
    const agent = new Agent(config);
    expect(agent.appid).to.be('1');
    expect(agent.server).to.be('ws://server/');
    expect(agent.reconnectDelay).to.be(1000);
    expect(agent.unknown).to.be();
  });

  it('new Agent should not ok with reportInterval < 60000', function () {
    const config = {
      appid: 1,
      server: 'server',
      reconnectDelay: 1,
      unknown: 'hehe',
      logdir: '/tmp',
      cmddir: path.join(__dirname, 'cmddir'),
      reportInterval: 10
    };
    try {
      const agent = new Agent(config);
      agent.run();
    } catch (err) {
      expect(err.message).to.be.ok();
      expect(err.message).to.be('report interval should not less than 60s');
    }
  });

  it('new wss Agent should ok', function () {
    const config = {
      appid: 1,
      server: 'agentserver.node.aliyun.com',
      reconnectDelay: 1,
      unknown: 'hehe',
      logdir: '/tmp',
      cmddir: path.join(__dirname, 'cmddir')
    };
    const agent = new Agent(config);
    expect(agent.appid).to.be('1');
    expect(agent.server).to.be('wss://agentserver.node.aliyun.com/');
    expect(agent.reconnectDelay).to.be(1000);
    expect(agent.unknown).to.be();
  });

  it('new wss Agent with wss prefix should ok', function () {
    const config = {
      appid: 1,
      server: 'wss://abc',
      reconnectDelay: 1,
      unknown: 'hehe',
      logdir: '/tmp',
      cmddir: path.join(__dirname, 'cmddir')
    };
    const agent = new Agent(config);
    expect(agent.appid).to.be('1');
    expect(agent.server).to.be('wss://abc');
    expect(agent.reconnectDelay).to.be(1000);
    expect(agent.unknown).to.be();
  });

  let wss;
  before(async function () {
    mm(Agent.prototype, 'handleMonitor', function () { });
    mm(Agent.prototype, 'startHeartbeat', function () { });
    mm(Agent.prototype, 'reconnect', function () { });
    await new Promise(resolve => {
      wss = new WebSocketServer({ port: 8990 }, function () {
        resolve();
      });
    });
    wss.on('connection', function connection(ws) {
      ws.on('message', function incoming(message) {
        console.log('receive message: %s', message);
        message = JSON.parse(message);
        expect(typeof message === 'object').to.be.ok();
        if (message.type === 'register') {
          expect(message.params.pid).to.be.ok();
          expect(message.params.version).to.be.ok();
          const result = { type: 'result', params: { 'result': 'REG_OK' } };
          const signature = utils.sha1(JSON.stringify(result), '2');
          result.signature = signature;
          ws.send(JSON.stringify(result));
        }
        if (message.type === 'close') {
          ws.close();
        }
      });
    });
  });

  after(function () {
    try {
      mm.restore();
      wss.close();
    } catch (ex) {
      console.log(ex);
    }
  });

  it('run should ok',async function () {
    const agent = new Agent({
      server: 'localhost:8990',
      appid: 1,
      secret: '2',
      logdir: '/tmp/',
      cmddir: '/tmp/'
    });

    agent.run();
    const result = await helper.check(agent);
    agent.teardown();
    agent.notReconnect = true;
    expect(result).to.be('ok');
  });

  describe('should not exit when run with libMode', function () {
    const agent = new Agent({
      libMode: true,
      server: 'localhost:8990',
      appid: 2,
      secret: '2',
      logdir: '/tmp/',
      cmddir: '/tmp/'
    });

    after(function () {
      agent.teardown();
    });

    it('should not exit when run with libMode',async function () {
      agent.run();
      const result = await helper.check(agent);
      expect(result).to.be('ok');
      // mock signature not exist
      agent.onMessage({
        signature: null,
        type: 'error',
        params: {
          error: 'mock error'
        }
      });
      // mock REG_NOK result
      const msg = {
        type: 'result',
        params: {
          result: 'REG_NOK'
        }
      };
      const signature = agent.signature(msg);
      msg.signature = signature;
      agent.onMessage(msg);

      // mock error type
      const msg2 = {
        type: 'error',
        params: {
          error: 'mock error type'
        }
      };
      const signature2 = agent.signature(msg2);
      msg2.signature = signature2;
      agent.onMessage(msg2);
      agent.sendMessage({type: 'close'});
      agent.notReconnect = true;
      agent.teardown();
    });
  });

});
