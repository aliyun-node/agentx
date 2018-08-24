'use strict';
const expect = require('expect.js');
const WebSocketServer = require('ws').Server;
const Agent = require('../../lib/agent');
const utils = require('../../lib/utils');
const mm = require('mm');
const fs = require('fs');
const path = require('path');
const orders = fs.readdirSync(path.join(__dirname, '../../lib/orders'));
const co = require('co');

describe('/lib/agent -> handle monitor', function () {
  describe('handle monitor correctlly', function () {
    let wss;
    let count = 0;
    before(co.wrap(function* () {
      // mock some unused function
      mm(Agent.prototype, 'startHeartbeat', function () { });
      mm(Agent.prototype, 'reconnect', function () { });
      orders.forEach((name, index) => {
        let order = require(path.join(__dirname, '../../lib/orders', name));
        mm(order, 'init', function () { });
        mm(order, 'reportInterval', 50);
        mm(order, 'run', function (cb) {
          if (!this.runStatus) {
            count++;
            this.runStatus = true;
          }
          if (!this.error && index % orders.length === 0) {
            cb('mock run error');
            this.error = true;
            return;
          }
          if (!this.params && index % orders.length === 1) {
            cb(null, {});
            this.params = true;
            return;
          }
        });
      });
      // create ws server
      yield new Promise(resolve => {
        wss = new WebSocketServer({ port: 8994 }, function () {
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
          }
        });
      });
    }));
    it('should work', co.wrap(function* () {
      let agent = new Agent({
        server: 'localhost:8994',
        appid: 1,
        secret: '2',
        cmddir: '/tmp',
        libMode: true,
        reportInterval: 60,
        logger: {
          info: function () { },
          warn: function () { },
          log: function () { },
          error: function (err) { }
        }
      });
      agent.run();
      let result = yield new Promise((resolve, reject) => {
        let timer, interval;
        timer = setTimeout(() => {
          interval && clearInterval(interval);
          resolve('failed');
        }, 1000);
        interval = setInterval(() => {
          if (count === orders.length) {
            interval && clearInterval(interval);
            timer && clearTimeout(timer);
            agent.monitorIntervalList.forEach(interval=>clearInterval(interval));
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