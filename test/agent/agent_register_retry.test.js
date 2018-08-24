'use strict';
const expect = require('expect.js');
const WebSocketServer = require('ws').Server;
const Agent = require('../../lib/agent');
const utils = require('../../lib/utils');
const mm = require('mm');
const co = require('co');

describe('/lib/agent -> register retry', function () {
  let registryRetryTimes = 3;
  describe(`register should retry ${registryRetryTimes} times`, function () {
    let wss;
    let connecTimes = 0;
    before(co.wrap(function* () {
      // mock some unused function
      mm(Agent.prototype, 'handleMonitor', function () { });
      mm(Agent.prototype, 'startHeartbeat', function () { });
      mm(Agent.prototype, 'reconnect', function () { });
      // create ws server
      yield new Promise(resolve => {
        wss = new WebSocketServer({ port: 8991 }, function () {
          resolve();
        });
      });
      wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
          // console.log('receive message: %s', message);
          message = JSON.parse(message);
          expect(typeof message === 'object').to.be.ok();
          expect(message.type === 'register').to.be.ok();
          connecTimes++;
          if (connecTimes === registryRetryTimes) {
            let result = { type: 'result', params: { result: 'REG_OK' } };
            let signature = utils.sha1(JSON.stringify(result), '2');
            result.signature = signature;
            ws.send(JSON.stringify(result));
            ws.close();
          }
        });
      });
    }));
    it('should retry', co.wrap(function* () {
      let agent = new Agent({
        server: 'localhost:8991',
        appid: 1,
        secret: '2',
        logger: {
          info: function () { },
          warn: function () { },
          log: function () { },
          error: function (err) { }
        }
      });
      agent.registerRetryDelay = 200;
      agent.run();
      let result = yield new Promise((resolve, reject) => {
        let timer, interval;
        timer = setTimeout(() => {
          interval && clearInterval(interval);
          resolve('failed');
        }, 1500);
        interval = setInterval(() => {
          if (agent.state === 'work') {
            expect(connecTimes).to.be(registryRetryTimes);
            interval && clearInterval(interval);
            timer && clearTimeout(timer);
            resolve('ok');
          }
        }, 100);
      });
      agent.teardown();
      expect(result).to.be('ok');
    }));
    after(function () {
      try {
        mm.restore();
        wss.close();
      } catch (ex) {
        console.log(ex);
      }
    });
  });

  describe('clear timer when teardown', function () {
    let wss;
    let connecTimes = 0;
    before(co.wrap(function* () {
      // mock some unused function
      mm(Agent.prototype, 'handleMonitor', function () { });
      mm(Agent.prototype, 'startHeartbeat', function () { });
      mm(Agent.prototype, 'reconnect', function () { });
      // create ws server
      yield new Promise(resolve => {
        wss = new WebSocketServer({ port: 8991 }, function () {
          resolve();
        });
      });
      wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
          // console.log('receive message: %s', message);
          message = JSON.parse(message);
          expect(typeof message === 'object').to.be.ok();
          expect(message.type === 'register').to.be.ok();
          connecTimes++;
          if (connecTimes === registryRetryTimes - 1) {
            ws.close();
          }
        });
      });
    }));
    it('should clear', co.wrap(function* () {
      let agent = new Agent({
        server: 'localhost:8991',
        appid: 1,
        secret: '2',
        logger: {
          info: function () { },
          warn: function () { },
          log: function () { },
          error: function (err) { }
        }
      });
      agent.registerRetryDelay = 200;
      agent.run();
      let result = yield new Promise((resolve, reject) => {
        let timer, interval;
        timer = setTimeout(() => {
          interval && clearInterval(interval);
          resolve('failed');
        }, 1500);
        interval = setInterval(() => {
          if (connecTimes === registryRetryTimes - 1) {
            agent.teardown();
            expect(agent.state).to.be('closed');
            interval && clearInterval(interval);
            timer && clearTimeout(timer);
            resolve('ok');
          }
        }, 100);
      });
      expect(result).to.be('ok');
    }));
    after(function () {
      try {
        mm.restore();
        wss.close();
      } catch (ex) {
        console.log(ex);
      }
    });
  });
});