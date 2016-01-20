'use strict';

var path = require('path');
var expect = require('expect.js');
var mm = require('mm');
var disk = require('../../lib/orders/disk_usage');

describe('/lib/orders/disk_usage.js', function () {
  before(function () {
    disk.init({
      cmddir: path.join(__dirname, '../cmddir')
    });
  });

  it('should ok', function (done) {
    disk.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('disk_usage');
      expect(params.metrics).to.be.ok();
      var metrics = params.metrics;
      expect(metrics).to.have.property('used_percent');
      expect(metrics.used_percent).to.lessThan(100);
      done();
    });
  });

  describe('command invalid', function () {
    before(function () {
      mm(require('../../lib/utils'), 'execFile', function (command, callback) {
        process.nextTick(function () {
          callback(new Error('mock error'));
        });
      });
    });

    after(function () {
      mm.restore();
    });

    it('should ok', function (done) {
      disk.run(function (err) {
        expect(err).to.be.ok();
        expect(err.message).to.be('mock error');
        done();
      });
    });
  });
});
