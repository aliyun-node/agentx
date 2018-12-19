'use strict';
const expect = require('expect.js');
const WebSocketServer = require('ws').Server;
const Agent = require('../../lib/agent');
const utils = require('../../lib/utils');
const mm = require('mm');
const co = require('co');

describe('/lib/agent -> heartbeat', function () {
  describe('heartbeat 3 times success', function () {
    let wss;
    let heartbeatTimes = 0;
    let heartheatTotalTimes = 3;
    before(co.wrap(function* () {
      // mock some unused function
      mm(Agent.prototype, 'handleMonitor', function () { });
      mm(Agent.prototype, 'reconnect', function () { });
      // create ws server
      yield new Promise(resolve => {
        wss = new WebSocketServer({ port: 8993 }, function () {
          resolve();
        });
      });
      wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
          // console.log('receive message: %s', message);
          message = JSON.parse(message);
          expect(typeof message === 'object').to.be.ok();
          if (message.type === 'register') {
            let result = { type: 'result', params: { 'result': 'REG_OK' } };
            let signature = utils.sha1(JSON.stringify(result), '2');
            result.signature = signature;
            ws.send(JSON.stringify(result));
            ws.send(JSON.stringify(result));
          }
          if (message.type === 'heartbeat') {
            heartbeatTimes++;
            let result = { type: 'result', params: { 'result': 'HEARTBEAT_ACK' } };
            let signature = utils.sha1(JSON.stringify(result), '2');
            result.signature = signature;
            ws.send(JSON.stringify(result));
            if (heartbeatTimes === heartheatTotalTimes) {
              ws.close();
            }
          }
        });
      });
    }));
    it('should work', co.wrap(function* () {
      let agent = new Agent({
        server: 'localhost:8993',
        appid: 1,
        secret: '2',
        libMode: true,
        logger: {
          info: function () { },
          warn: function () { },
          log: function () { },
          error: function (err) { }
        }
      });
      agent.heartbeatInterval = 200;
      agent.run();
      let result = yield new Promise((resolve, reject) => {
        let timer, interval;
        timer = setTimeout(() => {
          interval && clearInterval(interval);
          resolve('failed');
        }, 1000);
        interval = setInterval(() => {
          if (heartbeatTimes === heartheatTotalTimes) {
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
});