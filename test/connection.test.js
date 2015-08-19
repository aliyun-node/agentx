'use strict';

var expect = require('expect.js');
var WebSocketServer = require('ws').Server;
var Connection = require('../lib/connection');

describe('/lib/connection', function () {
  var wss;
  before(function () {
    wss = new WebSocketServer({ port: 8089 });
    wss.on('connection', function connection(ws) {
      ws.on('message', function incoming(message) {
        expect(message).to.be.ok();
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

  it('new Connection should ok', function (done) {
    var conn = new Connection('ws://localhost:8089/');
    var count = 0;
    conn.on('open', function () {
      count++;
      conn.sendMessage('Hi');
    });
    conn.on('close', function () {
      expect(count).to.be(1);
      done();
    });
    expect(conn.ws).to.be.ok();
  });
});
