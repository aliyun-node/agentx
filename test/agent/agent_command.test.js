'use strict';
const expect = require('expect.js');
const WebSocketServer = require('ws').Server;
const Agent = require('../../lib/agent');
const utils = require('../../lib/utils');
const mm = require('mm');
const fs = require('fs');

describe('/lib/agent -> heartbeat', function () {
  describe('heartbeat 3 times success', function () {
    let wss;
    let successFile = '';
    let failedFile = '';
    before(async function () {
      // mock some unused function
      mm(Agent.prototype, 'handleMonitor', function () { });
      mm(Agent.prototype, 'startHeartbeat', function () { });
      mm(Agent.prototype, 'reconnect', function () { });
      mm(utils, 'execCommand', function (file, args, opts, cb) { cb(null, 'stdout', 'stderr'); });
      mm(fs, 'access', function (file, flag, cb) {
        if (file.includes('mock-success')) {
          cb(null);
          successFile = 'mock-success';
        }
        if (file.includes('mock-error')) {
          cb('mock file error');
          failedFile = 'mock-error';
        }
      });
      // create ws server
      await new Promise(resolve => {
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
            setTimeout(() => {
              let result = { type: 'command', params: { 'command': 'mock-error' } };
              let signature = utils.sha1(JSON.stringify(result), '2');
              result.signature = signature;
              ws.send(JSON.stringify(result));
            }, 100);
            setTimeout(() => {
              let result = { type: 'command', params: { 'command': 'mock-success' } };
              let signature = utils.sha1(JSON.stringify(result), '2');
              result.signature = signature;
              ws.send(JSON.stringify(result));
              ws.close();
            }, 200);
          }
        });
      });
    });

    it('should work',async function () {
      let agent = new Agent({
        server: 'localhost:8994',
        appid: 1,
        secret: '2',
        cmddir: '/tmp',
        libMode: true,
        logger: {
          info: function () { },
          warn: function () { },
          log: function () { },
          error: function (err) { }
        }
      });
      agent.run();
      let result = await new Promise((resolve, reject) => {
        let timer, interval;
        timer = setTimeout(() => {
          interval && clearInterval(interval);
          resolve('failed');
        }, 1000);
        interval = setInterval(() => {
          if (successFile && failedFile) {
            expect(successFile).to.be('mock-success');
            expect(failedFile).to.be('mock-error');
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