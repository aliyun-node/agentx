'use strict';

const path = require('path');
const expect = require('expect.js');
const mm = require('mm');
const DiskUsageJob = require('../../lib/jobs/disk_usage');

describe('/lib/jobs/disk_usage.js', function () {

  it('should ok', async function () {
    const job = new DiskUsageJob({
      cmddir: path.join(__dirname, '../cmddir')
    });
    const params = await job.run();
    expect(params.type).to.be('disk_usage');
    expect(params.metrics).to.be.ok();
    const metrics = params.metrics;
    expect(metrics).to.have.property('used_percent');
    expect(metrics.used_percent).to.lessThan(100);
  });

  describe('mock disk usage', function () {
    const mock_stdout = [
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
      '/dev/disk2s3      275448    243528     31920    89%    /private/QQ',
      'tmpfs               786024        4    786020       1% /run/user/119',
      'tmpfs               786024       72    785952       1% /run/user/1000'
    ].join('\n');

    before(function () {
      mm.data(require('../../lib/utils'), 'execFileAsync', {stdout: mock_stdout});
    });

    after(function() {
      mm.restore();
    });

    it('should ok', async function () {
      const job = new DiskUsageJob({
        cmddir: path.join(__dirname, '../cmddir')
      });
      const params = await job.run();
      expect(params.type).to.be('disk_usage');
      expect(params.metrics).to.be.ok();
      const metrics = params.metrics;
      expect(metrics).to.have.property('used_percent');
      expect(metrics.used_percent).equal(95);
      expect(metrics['/']).equal(95);
      expect(metrics['used_percent']).equal(95);
      expect(metrics['/home/admin']).equal(90);
      expect(metrics['/data/app']).equal(0);
      expect(metrics).to.not.have.property('/Volumes/QQ');
      expect(metrics).to.not.have.property('/private/QQ');
    });
  });

  describe('user specify monitored disk', function () {
    const mock_stdout = [
      'Filesystem     1024-blocks      Used Available Capacity Mounted on',
      '/dev/sda3        580507708 271079084 309428624      47% /data'
    ].join('\n');

    before(function () {
      mm.data(require('../../lib/utils'), 'execFileAsync', {stdout: mock_stdout});
    });

    after(function() {
      mm.restore();
    });

    it('should ok', async function () {
      const job = new DiskUsageJob({
        disks: ['/data'],
        cmddir: path.join(__dirname, '../cmddir')
      });
      const params = await job.run();
      expect(params.type).to.be('disk_usage');
      expect(params.metrics).to.be.ok();
      const metrics = params.metrics;
      expect(metrics).to.have.property('used_percent');
      expect(metrics.used_percent).equal(47);
      expect(metrics['/data']).equal(47);
    });
  });

});
