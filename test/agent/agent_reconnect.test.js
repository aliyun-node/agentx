'use strict';

const path = require('path');
const expect = require('expect.js');
const WebSocketServer = require('ws').Server;
const Agent = require('../../lib/agent');
const utils = require('../../lib/utils');
const mm = require('mm');
const port = 8995;

let wssServerCount = 0;
let heartbeatNotReturn = false;
let heartbeatMissTimes = 0;

function createWss(port) {
  return new Promise(resolve => {
    const wss = new WebSocketServer({ port }, function () {
      wssServerCount++;
      resolve(wss);
    });
  });
}

function handleConnection(wss) {
  wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
      // console.log('receive message: %s', message);
      message = JSON.parse(message);
      expect(typeof message === 'object').to.be.ok();
      if (message.type === 'register') {
        const result = { type: 'result', params: { 'result': 'REG_OK' } };
        const signature = utils.sha1(JSON.stringify(result), '2');
        result.signature = signature;
        ws.send(JSON.stringify(result));
      }
      if (message.type === 'heartbeat') {
        if (heartbeatNotReturn) {
          heartbeatMissTimes++;
          return;
        }
        const result = { type: 'result', params: { 'result': 'HEARTBEAT_ACK' } };
        const signature = utils.sha1(JSON.stringify(result), '2');
        result.signature = signature;
        ws.send(JSON.stringify(result));
      }
      if (message.type === 'close') {
        ws.close();
      }
      if (message.type === 'shutdown') {
        wss.close();
        wssServerCount--;
        if (message.params && message.params.restart) {
          setTimeout(async function () {
            const wss = await createWss(port);
            handleConnection(wss);
          }, 500);
        }
      }
    });
  });
}

function connectedSucces(agent, timeout) {
  timeout = timeout || 1000;
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line prefer-const
    let interval;
    const timer = setTimeout(() => {
      interval && clearInterval(interval);
      resolve('failed');
    }, timeout);

    interval = setInterval(() => {
      if (agent.state === 'work') {
        interval && clearInterval(interval);
        timer && clearTimeout(timer);
        resolve('ok');
      }
    }, 100);
  });
}

function heartbeatMiss(count, timeout) {
  timeout = timeout || 1000;
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line prefer-const
    let interval;
    const timer = setTimeout(() => {
      interval && clearInterval(interval);
      resolve('failed');
    }, timeout);

    interval = setInterval(() => {
      if (heartbeatMissTimes === count) {
        interval && clearInterval(interval);
        timer && clearTimeout(timer);
        resolve('ok');
      }
    }, 100);
  });
}

function createAgent(config) {
  const defaultConfig = {
    server: 'localhost:8995',
    appid: 1,
    secret: '2',
    libMode: true,
    heartbeatInterval: 0.1, // heartbeat: 100ms
    reconnectDelayBase: 0, // reconnect: 0 - 100ms
    reconnectDelay: 0.1,
    cmddir: path.join(__dirname, '../cmddir'),
    logger: {
      info: function () { },
      warn: function () { },
      log: function () { },
      error: function (err) { }
    }
  };
  config = config || {};
  return new Agent({
    ...defaultConfig,
    ...config
  });
}

describe('/lib/agent -> reconnect', function () {
  let agent;
  describe('reconnect when server close', function () {
    let wss;
    before(async function () {
      // mock some unused function
      mm(Agent.prototype, 'handleMonitor', function () { });
      // create ws server
      wss = await createWss(port);
      handleConnection(wss);
    });

    it('should work',async function () {
      // create agent
      agent = createAgent();
      agent.run();
      // 1. first connect success
      const result1 = await connectedSucces(agent);
      expect(wssServerCount).to.be(1);
      expect(result1).to.be('ok');
      expect(agent.connectSockets).to.be(1);

      // 2. close server and after 500ms restart it
      agent.sendMessage({ type: 'shutdown', params: { restart: true } });
      // will reconnect success
      const result2 = await connectedSucces(agent, 1500);
      expect(wssServerCount).to.be(1);
      expect(result2).to.be('ok');
      expect(agent.connectSockets).to.be(1);

      // 3. reconnect when heartbeat lost
      heartbeatNotReturn = true;
      agent.sendMessage({ type: 'shutdown', params: { restart: true } });
      const heartbeatMiss3Times = await heartbeatMiss(3, 1500);
      expect(heartbeatMiss3Times).to.be('ok');
      // miss 3 times heartbeat and also connected success
      const result3 = await connectedSucces(agent, 1500);
      expect(wssServerCount).to.be(1);
      expect(result3).to.be('ok');
      expect(agent.connectSockets).to.be(1);
      // clear source
      heartbeatNotReturn = false;
      heartbeatMissTimes = 0;
    });

    after(function () {
      try {
        agent && agent.sendMessage({ type: 'shutdown' });
        agent && agent.teardown();
        agent && (agent.notReconnect = true);
        mm.restore();
        wss && wss.close();
      } catch (ex) {
        console.log(ex);
      }
    });
  });
});