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
      mm(require('../../lib/utils'), 'execFile', function (command, args, callback) {
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

  describe('mock disk usage', function () {
    var mock_stdout = [
      'Filesystem     1024-blocks     Used Available Capacity Mounted on',
      'udev               3918976        4   3918972       1% /dev',
      'tmpfs               786024     1216    784808       1% /run',
      '/dev/sda6         14674404 13105292    800652      95% /',
      'none                     4        0         4       0% /sys/fs/cgroup',
      '/dev/sda4                4        0         4       0% /data/app',
      'none                  5120        4      5116       1% /run/lock',
      'none               3930104   166160   3763944       5% /run/shm',
      'none                102400        0    102400       0% /run/user',
      '/dev/sda3         80448976 67980916   8358408      90% /home/admin',
      '/dev/disk2s2      275448    243528     31920    89%    /Volumes/QQ',
      'tmpfs               786024        4    786020       1% /run/user/119',
      'tmpfs               786024       72    785952       1% /run/user/1000'
    ].join('\n');

    before(function () {
      mm.data(require('../../lib/utils'), 'execFile', mock_stdout);
    });

    it('should ok', function (done) {
      disk.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('disk_usage');
        expect(params.metrics).to.be.ok();
        var metrics = params.metrics;
        expect(metrics).to.have.property('used_percent');
        expect(metrics.used_percent).equal(95);
        expect(metrics['/']).equal(95);
        expect(metrics['used_percent']).equal(95);
        expect(metrics['/home/admin']).equal(90);
        expect(metrics['/data/app']).equal(0);
        expect(metrics).to.not.have.property('/Volumes/QQ');
        done();
      });
    });

    after(function() {
      mm.restore();
    });
  });
});
