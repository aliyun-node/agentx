'use strict';
const expect = require('expect.js');
const WebSocketServer = require('ws').Server;
const Agent = require('../../lib/agent');
const utils = require('../../lib/utils');
const mm = require('mm');
const co = require('co');

describe('/lib/agent -> register signature', function () {
  describe('register signature failed with lib model', function () {
    let wss;
    let signatureErrorMessage = 'mock signature failed with error';
    before(co.wrap(function* () {
      // mock some unused function
      mm(Agent.prototype, 'handleMonitor', function () { });
      mm(Agent.prototype, 'startHeartbeat', function () { });
      mm(Agent.prototype, 'reconnect', function () { });
      // create ws server
      yield new Promise(resolve => {
        wss = new WebSocketServer({ port: 8992 }, function () {
          resolve();
        });
      });
      wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
          // console.log('receive message: %s', message);
          message = JSON.parse(message);
          expect(typeof message === 'object').to.be.ok();
          expect(message.type === 'register').to.be.ok();
          let result = { type: 'error', params: { error: signatureErrorMessage } };
          ws.send(JSON.stringify(result));
          ws.close();
        });
      });
    }));
    it('should get signature error', co.wrap(function* () {
      let error;
      let agent = new Agent({
        server: 'localhost:8992',
        appid: 1,
        secret: '2',
        libMode: true,
        logger: {
          info: function () { },
          warn: function () { },
          log: function () { },
          error: function (err) { error = err.message; }
        }
      });
      agent.registerRetryDelay = 200;
      agent.run();
      let result = yield new Promise((resolve, reject) => {
        let timer, interval;
        timer = setTimeout(() => {
          interval && clearInterval(interval);
          resolve('failed');
        }, 1000);
        interval = setInterval(() => {
          if (error) {
            expect(agent.state).not.to.be('work');
            expect(error).to.be(signatureErrorMessage);
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

  describe('register signature failed without lib model', function () {
    let wss;
    let signatureErrorMessage = 'mock signature failed with error';
    let processSendData = '';
    let processExitCode = 0;
    before(co.wrap(function* () {
      // mock some unused function
      mm(Agent.prototype, 'handleMonitor', function () { });
      mm(Agent.prototype, 'startHeartbeat', function () { });
      mm(Agent.prototype, 'reconnect', function () { });
      mm(process, 'send', function (data) { processSendData = data; });
      mm(process, 'exit', function (code) { processExitCode = code; });
      // create ws server
      yield new Promise(resolve => {
        wss = new WebSocketServer({ port: 8992 }, function () {
          resolve();
        });
      });
      wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
          // console.log('receive message: %s', message);
          message = JSON.parse(message);
          expect(typeof message === 'object').to.be.ok();
          expect(message.type === 'register').to.be.ok();
          let result = { type: 'error', params: { error: signatureErrorMessage } };
          ws.send(JSON.stringify(result));
          ws.close();
        });
      });
    }));
    it('should get signature error', co.wrap(function* () {
      let agent = new Agent({
        server: 'localhost:8992',
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
        }, 1000);
        interval = setInterval(() => {
          if (processSendData && processExitCode) {
            expect(agent.state).not.to.be('work');
            expect(processSendData.type).to.be('suicide');
            expect(processExitCode).to.be(-3);
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

  describe('register signature error', function () {
    let wss;
    let signatureErrorMessage = 'mock signature failed with error';
    before(co.wrap(function* () {
      // mock some unused function
      mm(Agent.prototype, 'handleMonitor', function () { });
      mm(Agent.prototype, 'startHeartbeat', function () { });
      mm(Agent.prototype, 'reconnect', function () { });
      // create ws server
      yield new Promise(resolve => {
        wss = new WebSocketServer({ port: 8992 }, function () {
          resolve();
        });
      });
      wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
          // console.log('receive message: %s', message);
          message = JSON.parse(message);
          expect(typeof message === 'object').to.be.ok();
          expect(message.type === 'register').to.be.ok();
          let result = { type: 'error', params: { error: signatureErrorMessage }, signature: 'test' };
          ws.send(JSON.stringify(result));
          ws.close();
        });
      });
    }));
    it('should not work', co.wrap(function* () {
      let agent = new Agent({
        server: 'localhost:8992',
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
      agent.registerRetryDelay = 200;
      agent.run();
      let result = yield new Promise((resolve, reject) => {
        let timer, interval;
        timer = setTimeout(() => {
          interval && clearInterval(interval);
          resolve('failed');
        }, 1000);
        interval = setInterval(() => {
          if (agent.state) {
            expect(agent.state).not.to.be('work');
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

  describe('register signature success and reg not ok with lib model', function () {
    let wss;
    before(co.wrap(function* () {
      // mock some unused function
      mm(Agent.prototype, 'handleMonitor', function () { });
      mm(Agent.prototype, 'startHeartbeat', function () { });
      mm(Agent.prototype, 'reconnect', function () { });
      // create ws server
      yield new Promise(resolve => {
        wss = new WebSocketServer({ port: 8992 }, function () {
          resolve();
        });
      });
      wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
          // console.log('receive message: %s', message);
          message = JSON.parse(message);
          expect(typeof message === 'object').to.be.ok();
          expect(message.type === 'register').to.be.ok();
          let result = { type: 'result', params: { result: 'REG_NOK' } };
          let signature = utils.sha1(JSON.stringify(result), '2');
          result.signature = signature;
          ws.send(JSON.stringify(result));
          ws.close();
        });
      });
    }));
    it('should not work', co.wrap(function* () {
      let error;
      let agent = new Agent({
        server: 'localhost:8992',
        appid: 1,
        secret: '2',
        libMode: true,
        logger: {
          info: function () { },
          warn: function () { },
          log: function () { },
          error: function (err) { error = err.message; }
        }
      });
      agent.registerRetryDelay = 200;
      agent.run();
      let result = yield new Promise((resolve, reject) => {
        let timer, interval;
        timer = setTimeout(() => {
          interval && clearInterval(interval);
          resolve('failed');
        }, 1000);
        interval = setInterval(() => {
          if (error) {
            expect(error).to.be('agentx register failed: REG_NOK');
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

  describe('register signature success and reg not ok without lib model', function () {
    let wss;
    let processSendData = '';
    let processExitCode = 0;
    before(co.wrap(function* () {
      // mock some unused function
      mm(Agent.prototype, 'handleMonitor', function () { });
      mm(Agent.prototype, 'startHeartbeat', function () { });
      mm(Agent.prototype, 'reconnect', function () { });
      mm(process, 'send', function (data) { processSendData = data; });
      mm(process, 'exit', function (code) { processExitCode = code; });
      // create ws server
      yield new Promise(resolve => {
        wss = new WebSocketServer({ port: 8992 }, function () {
          resolve();
        });
      });
      wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
          // console.log('receive message: %s', message);
          message = JSON.parse(message);
          expect(typeof message === 'object').to.be.ok();
          expect(message.type === 'register').to.be.ok();
          let result = { type: 'result', params: { 'result': 'REG_NOK' } };
          let signature = utils.sha1(JSON.stringify(result), '2');
          result.signature = signature;
          ws.send(JSON.stringify(result));
          ws.close();
        });
      });
    }));
    it('should not work', co.wrap(function* () {
      let agent = new Agent({
        server: 'localhost:8992',
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
        }, 1000);
        interval = setInterval(() => {
          if (processSendData && processExitCode) {
            expect(processSendData.type).to.be('suicide');
            expect(processExitCode).to.be(-2);
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

  describe('register signature success and reg ok', function () {
    let wss;
    before(co.wrap(function* () {
      // mock some unused function
      mm(Agent.prototype, 'handleMonitor', function () { });
      mm(Agent.prototype, 'startHeartbeat', function () { });
      mm(Agent.prototype, 'reconnect', function () { });
      // create ws server
      yield new Promise(resolve => {
        wss = new WebSocketServer({ port: 8992 }, function () {
          resolve();
        });
      });
      wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
          // console.log('receive message: %s', message);
          message = JSON.parse(message);
          expect(typeof message === 'object').to.be.ok();
          expect(message.type === 'register').to.be.ok();
          let result = { type: 'result', params: { 'result': 'REG_OK' } };
          let signature = utils.sha1(JSON.stringify(result), '2');
          result.signature = signature;
          ws.send(JSON.stringify(result));
          ws.close();
        });
      });
    }));
    it('should work', co.wrap(function* () {
      let agent = new Agent({
        server: 'localhost:8992',
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
      agent.registerRetryDelay = 200;
      agent.run();
      let result = yield new Promise((resolve, reject) => {
        let timer, interval;
        timer = setTimeout(() => {
          interval && clearInterval(interval);
          resolve('failed');
        }, 1000);
        interval = setInterval(() => {
          if (agent.state === 'work') {
            expect(agent.state).to.be('work');
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