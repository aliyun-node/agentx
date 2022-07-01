'use strict';

const expect = require('expect.js');
const WebSocketServer = require('ws').Server;
const Agent = require('../../lib/agent');
const utils = require('../../lib/utils');
const mm = require('mm');

describe('/lib/agent -> heartbeat', function () {
  describe('heartbeat 3 times success', function () {
    let wss;
    let heartbeatTimes = 0;
    const heartheatTotalTimes = 3;
    before(async function () {
      // mock some unused function
      mm(Agent.prototype, 'handleMonitor', function () { });
      mm(Agent.prototype, 'reconnect', function () { });
      // create ws server
      await new Promise(resolve => {
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
            const result = { type: 'result', params: { 'result': 'REG_OK' } };
            const signature = utils.sha1(JSON.stringify(result), '2');
            result.signature = signature;
            ws.send(JSON.stringify(result));
            ws.send(JSON.stringify(result));
          }
          if (message.type === 'heartbeat') {
            heartbeatTimes++;
            const result = { type: 'result', params: { 'result': 'HEARTBEAT_ACK' } };
            const signature = utils.sha1(JSON.stringify(result), '2');
            result.signature = signature;
            ws.send(JSON.stringify(result));
            if (heartbeatTimes === heartheatTotalTimes) {
              ws.close();
            }
          }
        });
      });
    });

    it('should work',async function () {
      const agent = new Agent({
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
      const result = await new Promise((resolve, reject) => {
        // eslint-disable-next-line prefer-const
        let interval;
        const timer = setTimeout(() => {
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
    });

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