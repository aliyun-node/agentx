'use strict';

const mm = require('mm');
const fs = require('fs');
const path = require('path');
const expect = require('expect.js');
const ListCoreJob = require('../../lib/jobs/list_core');
const assert = require('assert');

describe('constructor', function () {
  it('should ok', async function () {
    const job = new ListCoreJob({ coredir: [] });
    assert.deepStrictEqual(job.coredir, []);
  });

  it('coredir is string should ok', async function () {
    const job = new ListCoreJob({ coredir: '/tmp' });
    assert.deepStrictEqual(job.coredir, ['/tmp']);
  });

  it('ignore coredir is number should ok', async function () {
    const job = new ListCoreJob({ coredir: 1 });
    assert.deepStrictEqual(job.coredir, []);
  });
});

describe('mock non-linux', function () {
  before(function () {
    mm.data(require('os'), 'platform', 'darwin');
  });

  after(function () {
    mm.restore();
  });

  it('no coredirs', async function () {
    const job = new ListCoreJob({ coredir: [] });
    const params = await job.run();
    expect(params).to.be(null);
  });
});

describe('mock linux', function () {

  describe('core created before agentx startup will not reported', function () {
    const mock = {
      isFile: function () { return true; },
      dev: 2053,
      mode: 16893,
      nlink: 2,
      uid: 1000,
      gid: 1000,
      rdev: 0,
      blksize: 4096,
      ino: 2367914,
      size: 4096,
      blocks: 8,
      atimeMs: 1522831557878.927,
      mtimeMs: 1522831557778.928 - 70000,
      ctimeMs: 1522831557778.928 - 70000,
      birthtimeMs: 1522831557778.928,
      atime: '2018-04-04T08:45:57.879Z',
      mtime: '2018-04-04T08:45:57.779Z',
      ctime: '2018-04-04T08:45:57.779Z',
      birthtime: '2018-04-04T08:45:57.779Z'
    };

    const dir = path.join(__dirname, '../logdir');
    const corePath = path.join(dir, 'core.123');
    before(function () {
      mm.syncData(require('os'), 'platform', 'linux');
      mm.data(require('fs'), 'stat', mock);
      fs.writeFileSync(corePath, '');
    });

    after(function () {
      mm.restore();
      fs.unlinkSync(corePath);
    });

    it('should ok', async function () {
      const job = new ListCoreJob({
        coredir: [dir]
      });
      const params = await job.run();
      expect(params.type).to.be('coredump');
      expect(params.metrics).to.be.ok();
      expect(params.metrics.length).to.be(1);
    });
  });

  describe('coredir not specified', function () {
    before(function () {
      mm.syncData(require('os'), 'platform', 'linux');
    });

    after(function () {
      mm.restore();
    });

    it('should ok', async function () {
      const job = new ListCoreJob({ coredir: [] });
      const params = await job.run();
      expect(params).to.be(null);
    });
  });

  describe('when specify the coredir', function () {
    const dir = path.join(__dirname, '../logdir');
    const corePath = path.join(dir, 'core.123');
    before(function () {
      mm.syncData(require('os'), 'platform', 'linux');
      fs.writeFileSync(corePath, '');
    });

    after(function () {
      mm.restore();
      fs.unlinkSync(corePath);
    });

    it('should ok', async function () {
      const job = new ListCoreJob({ coredir: [dir] });
      const params = await job.run();
      expect(params.type).to.be('coredump');
      expect(params.metrics).to.be.ok();
      expect(params.metrics.length).to.be(1);
      expect(params.metrics[0].path).to.be(corePath);
    });
  });

  describe('when coredir not exists', function () {
    before(function () {
      mm.syncData(require('os'), 'platform', 'linux');
    });

    after(function () {
      mm.restore();
    });

    it('should ok', async function () {
      const job = new ListCoreJob({
        coredir: [path.join(__dirname, '../non-logdir')]
      });
      const params = await job.run();
      expect(params.type).to.be('coredump');
      expect(params.metrics).to.be.ok();
      expect(params.metrics.length).to.be(0);
    });
  });

  describe('when coredir is empty', function () {
    before(function () {
      mm.syncData(require('os'), 'platform', 'linux');
    });

    after(function () {
      mm.restore();
    });

    it('should ok', async function () {
      const job = new ListCoreJob({
        coredir: [
          path.join(__dirname, '../logdir/empty')
        ]
      });
      const params = await job.run();
      expect(params.type).to.be('coredump');
      expect(params.metrics).to.be.ok();
      expect(params.metrics.length).to.be(0);
    });
  });

  describe('when duplicate dir configured', function () {
    const dir = path.join(__dirname, '../logdir');
    const corePath = path.join(dir, 'core.123');
    before(function () {
      mm.syncData(require('os'), 'platform', 'linux');
      fs.writeFileSync(corePath, '');
    });

    after(function () {
      mm.restore();
      fs.unlinkSync(corePath);
    });

    it('should ok', async function () {
      const job = new ListCoreJob({ coredir: [dir, dir, dir] });
      const params = await job.run();
      expect(params.type).to.be('coredump');
      expect(params.metrics).to.be.ok();
      expect(params.metrics.length).to.be(1);
      expect(params.metrics[0].path).to.be(corePath);
    });
  });

  describe('when coredir specified by /proc/sys/kernel/core_pattern', function () {
    const dir = path.join(__dirname, '../logdir');
    const corePath1 = path.join(dir, 'core.12345');
    const corePath2 = path.join(dir, 'coredump_12345');
    const corePath3 = path.join(dir, 'coredump_23456');
    const mock = path.join(dir, 'coredump_%e_%P');

    before(function () {
      mm.syncData(require('os'), 'platform', 'linux');
      mm(require('fs'), 'readFileSync', function (path) {
        if (path === '/proc/sys/kernel/core_pattern') {
          return mock;
        }

        return '';
      });
      mm(require('fs'), 'existsSync', function (path) {
        if (path === '/proc/sys/kernel/core_pattern') {
          return true;
        }

        if (path === dir) {
          return true;
        }

        return false;
      });
      fs.writeFileSync(corePath1, '');
      fs.writeFileSync(corePath2, '');
      fs.writeFileSync(corePath3, '');
    });

    after(function () {
      mm.restore();
      fs.unlinkSync(corePath1);
      fs.unlinkSync(corePath2);
      fs.unlinkSync(corePath3);
    });

    it('should ok', async function () {
      const job = new ListCoreJob();
      const params = await job.run();
      expect(params.type).to.be('coredump');
      expect(params.metrics).to.be.ok();
      expect(params.metrics.length).to.be(3);
      const paths = params.metrics.map((d) => {
        return d.path;
      });
      expect(paths.indexOf(corePath1)).not.to.be(-1);
      expect(paths.indexOf(corePath2)).not.to.be(-1);
      expect(paths.indexOf(corePath3)).not.to.be(-1);
    });
  });

  describe('when core dumped to PWD', function () {
    const corePath = path.join(process.env.PWD, 'core.56789');
    before(function () {
      mm.syncData(require('os'), 'platform', 'linux');
      mm(require('fs').promises, 'access', async function (path, flag) {
        if (path === '') {
          return;
        }
      });
      mm(require('fs').promises, 'readFile', async function (path, flag) {
        if (path === '/proc/19672/environ') {
          return `a=b\u0000PWD=${process.env.PWD}`;
        }
      });
      mm(require('../../lib/utils'), 'execAsync', async function () {
        return {stdout: '19672 node xxx.js'};
      });
      fs.writeFileSync(corePath, '');
    });

    it('should ok', async function () {
      const job = new ListCoreJob();
      const params = await job.run();

      expect(params.type).to.be('coredump');
      expect(params.metrics).to.be.ok();
      expect(params.metrics.length).to.be(1);
      expect(params.metrics[0].path).to.be(corePath);
    });

    after(function () {
      mm.restore();
      fs.unlinkSync(corePath);
    });
  });
});
