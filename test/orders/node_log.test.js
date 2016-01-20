'use strict';

var fs = require('fs');
var path = require('path');

var expect = require('expect.js');
var rewire = require('rewire');
var mm = require('mm');

var helper = require('../../lib/utils');

var nodeLog = rewire('../../lib/orders/node_log');

describe('/lib/orders/node_log.js', function () {
  before(function () {
    mm(helper, 'getYYYYMMDD', function () {
      return '20151209';
    });

    nodeLog.init({
      logdir: path.join(__dirname, '../logdir')
    });
  });

  after(function () {
    mm.restore();
  });

  it('should ok', function (done) {
    nodeLog.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('node_log');
      expect(params.metrics).to.be.ok();
      var metrics = params.metrics;
      expect(metrics.ok).to.be.ok();
      expect(metrics.data).to.have.length(192);
      metrics.data.forEach(function (item) {
        expect(item.pid).to.be('45020');
      });
      done();
    });
  });

  it('getNodeLog should ok', function () {
    var logPath = path.join(__dirname, '../logdir/node-20151209.log');
    var log = fs.readFileSync(logPath, 'utf8');
    var getNodeLog = nodeLog.__get__('getNodeLog');
    var parsed = getNodeLog(log);
    var procs = {};
    parsed.data.forEach((item) => {
      if (!procs[item.pid]) {
        procs[item.pid] = {};
      }
      procs[item.pid][item.item] = item.value;
    });
    console.log(procs);
  });

  it('getCurrentLogPath should ok', function () {
    var getCurrentLogPath = nodeLog.__get__('getCurrentLogPath');
    var logPath = path.join(__dirname, '../logdir/node-20151209.log');
    expect(getCurrentLogPath()).to.be(logPath);
  });

  describe('no logdir', function () {
    before(function () {
      nodeLog.logdir = '';
    });

    it('should ok', function (done) {
      nodeLog.run(function (err) {
        expect(err).to.be.ok();
        expect(err.message).to.be('Not specific logdir in agentx config file');
        done();
      });
    });
  });
});
