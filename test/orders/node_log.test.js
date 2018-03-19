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
    // backup logfile
    var logPath = path.join(__dirname, '../logdir/node-20151209.log');
    var log = fs.readFileSync(logPath, 'utf8');

    nodeLog.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('node_log');
      expect(params.metrics).to.be.ok();
      var metrics = params.metrics;
      expect(metrics.ok).to.be.ok();
      expect(metrics.data).to.have.length(0);
      metrics.data.forEach(function (item) {
        expect(item.pid).to.be('45020');
      });
    });

    var append = '[2015-12-09 20:24:24.453835] [info] [heap] [45020]' +
      ' rss: 69312512, vsz: 3160494080, heap_used: 26779680, ' +
      'heap_available: 1486138032, heap_total: 59792128, ' +
      'heap_limit: 1535115264, heap_executeable: 8388608, ' +
      'total_physical_size: 0, memory_allocator_used: 63963136, ' +
      'memory_allocator_available: 1471152128, new_space_size: 1905968, ' +
      'new_space_used: 1905968, new_space_available: 14605008, ' +
      'new_space_committed: 33021952, old_space_size: 18635144, ' +
      'old_space_used: 18619120, old_space_available: 966304, ' +
      'old_space_committed: 19606784, code_space_size: 4618528, ' +
      'code_space_used: 4593856, code_space_available: 479808, ' +
      'code_space_committed: 5099520, map_space_size: 2063824, ' +
      'map_space_used: 1660736, map_space_available: 0, ' +
      'map_space_committed: 2063872, lo_space_size: 0, lo_space_used: 0, ' +
      'lo_space_available: 1470086912, lo_space_committed: 0, ' +
      'amount_of_external_allocated_memory: 43056';

    // append sth
    fs.appendFileSync(logPath, append);

    nodeLog.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('node_log');
      expect(params.metrics).to.be.ok();
      var metrics = params.metrics;
      expect(metrics.ok).to.be.ok();
      expect(metrics.data).to.have.length(31);
      metrics.data.forEach(function (item) {
        expect(item.pid).to.be('45020');
      });

      // restore log file
      fs.writeFileSync(logPath, log);
      done();
    });
  });

  it('should ok with no change', function (done) {
    nodeLog.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('node_log');
      expect(params.metrics).to.be.ok();
      var metrics = params.metrics;
      expect(metrics.ok).to.be.ok();
      expect(metrics.data).to.have.length(0);
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
    expect(procs).to.have.property('45020');
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

  describe('inexist logdir', function () {
    before(function () {
      nodeLog.init({
        logdir: path.join(__dirname, '../logsx')
      });
    });

    it('should ok', function (done) {
      nodeLog.run(function (err) {
        expect(err).to.not.be.ok();
        done();
      });
    });
  });
});
