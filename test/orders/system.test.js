'use strict';

var expect = require('expect.js');
var system = require('../../lib/orders/system');
var mm = require('mm');

describe('/lib/orders/system.js', function () {
  it('should ok', function (done) {
    system.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('system');
      expect(params.metrics).to.be.ok();
      var metrics = params.metrics;
      expect(metrics).to.have.key('uptime');
      expect(metrics).to.have.key('load1');
      expect(metrics).to.have.key('load5');
      expect(metrics).to.have.key('load15');
      expect(metrics).to.have.key('cpu');
      expect(metrics).to.have.key('cpu_count');
      done();
    });
  });

  describe('mock linux', function () {
    var mock_stdout = [
      'cpu  798284 5542 276534 8665824 95901 0 351 0 0 0',
      'cpu0 221696 1179 84101 2862208 36905 0 129 0 0 0',
      'cpu1 177452 1364 61528 1937851 24988 0 78 0 0 0',
      'cpu2 207980 1578 71366 1919851 20990 0 38 0 0 0',
      'cpu3 191154 1419 59537 1945913 13017 0 105 0 0 0',
      'intr 44011703 24 36009 0 0 0 0 0 0 1 6969 0 0 330295 0 0 0 0 0 0 0 0 0 0 77 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 535245 107 254200 19 1982037 22 97 403886 10463 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0',
      'ctxt 171708955',
      'btime 1492416587',
      'processes 20911',
      'procs_running 1',
      'procs_blocked 0',
      'softirq 14471654 61 5351537 571 29336 244132 3 36135 5123307 0 3686572'
    ].join('\n');

    before(function () {
      mm.data(require('fs'), 'readFileSync', mock_stdout);
    });

    it('should ok', function (done) {
      system.run(function (err, params) {
        console.log(params);
        expect(err).not.to.be.ok();
        expect(params.type).to.be('system');
        expect(params.metrics).to.be.ok();
        var metrics = params.metrics;
        expect(metrics).to.have.key('uptime');
        expect(metrics).to.have.key('load1');
        expect(metrics).to.have.key('load5');
        expect(metrics).to.have.key('load15');
        expect(metrics).to.have.key('cpu');
        expect(metrics).to.have.key('cpu_count');
        done();
      });
    });

    after(function() {
      mm.restore();
    });
  });

  describe('mock non nonLinux', function () {
    var mock_stdout = 'nonLinux';

    before(function () {
      mm.data(require('os'), 'type', mock_stdout);
    });

    it('should ok', function (done) {
      system.run(function (err, params) {
        console.log(params);
        expect(err).not.to.be.ok();
        expect(params.type).to.be('system');
        expect(params.metrics).to.be.ok();
        var metrics = params.metrics;
        expect(metrics).to.have.key('uptime');
        expect(metrics).to.have.key('load1');
        expect(metrics).to.have.key('load5');
        expect(metrics).to.have.key('load15');
        expect(metrics).to.have.key('cpu');
        expect(metrics).to.have.key('cpu_count');
        done();
      });
    });

    after(function() {
      mm.restore();
    });
  });

});
