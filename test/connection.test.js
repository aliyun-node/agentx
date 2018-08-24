'use strict';

var expect = require('expect.js');
var WebSocketServer = require('ws').Server;
var Connection = require('../lib/connection');
var packageInfo = require('../package.json');

describe('/lib/connection', function () {
  var wss;
  before(function () {
    wss = new WebSocketServer({ port: 8089 });
    wss.on('connection', function connection(ws) {
      ws.on('message', function incoming(message) {
        message = JSON.parse(message);
        expect(typeof message === 'object').to.be.ok();
        if (message.type === 'register') {
          expect(message.params.pid).to.be.ok();
          expect(message.params.version).to.be.ok();
          ws.send(JSON.stringify({ type: 'result', params: { 'result': 'REG_OK' } }));
        }
        if (message.type === 'mock-invalid-error') {
          ws.send('not json data');
          ws.close();
        }
      });
    });
  });

  after(function () {
    try {
      wss.close();
    } catch (ex) {
      console.log(ex);
    }
  });

  it('new Connection should ok', function (done) {
    var conn = new Connection('ws://localhost:8089/');
    var count = 0;
    conn.on('open', function () {
      count++;
      conn.sendMessage({ type: 'register', params: { version: packageInfo.version, pid: process.pid } });
      conn.sendMessage({ type: 'mock-invalid-error' });
    });
    conn.on('close', function () {
      expect(count).to.be(1);
      done();
    });
    expect(conn.ws).to.be.ok();
  });
});
