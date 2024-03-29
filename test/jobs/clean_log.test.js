'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const expect = require('expect.js');
const rewire = require('rewire');
const mm = require('mm');

const helper = require('../../lib/utils');
const assert = require('assert');

const CleanLogJob = rewire('../../lib/jobs/clean_log');

const unixServerPath = path.join(__dirname, '../fixtures/unixServer.js');

const oldfile1 = path.join(__dirname, '../logdir/node-20180225.log');
const oldfile2 = path.join(__dirname, '../logdir/access-20180225.log');
const oldfile3 = path.join(__dirname, '../logdir/tracing-20180225.log');
const oldfile4 = path.join(__dirname, '../logdir/node-20180226.log');
const oldfile5 = path.join(__dirname, '../logdir/access-20180226.log');
const oldfile6 = path.join(__dirname, '../logdir/tracing-20180226.log');
const oldfile7 = path.join(__dirname, '../logdir/node-20180227.log');
const oldfile8 = path.join(__dirname, '../logdir/access-20180227.log');
const oldfile9 = path.join(__dirname, '../logdir/tracing-20180227.log');

describe('/lib/jobs/clean_log.js', function () {
  const socketPids = [];
  const socketsLength = 10;

  before(function () {
    mm(helper, 'getYYYYMMDD', function () {
      return '20180305';
    });

    fs.writeFileSync(oldfile1, 'empty file');
    fs.writeFileSync(oldfile2, 'empty file');
    fs.writeFileSync(oldfile3, 'empty file');
    fs.writeFileSync(oldfile4, 'empty file');
    fs.writeFileSync(oldfile5, 'empty file');
    fs.writeFileSync(oldfile6, 'empty file');
    fs.writeFileSync(oldfile7, 'empty file');
    fs.writeFileSync(oldfile8, 'empty file');
    fs.writeFileSync(oldfile9, 'empty file');

    // create domain sockets
    for (let i = 0; i < socketsLength; i++) {
      const child = cp.spawnSync('node', [unixServerPath]);
      socketPids.push(child.pid);
    }
  });

  after(function () {
    mm.restore();
  });

  it('should ok', async function () {
    const job = new CleanLogJob({
      logdir: path.join(__dirname, '../logdir')
    });
    expect(fs.existsSync(oldfile1)).to.be(true);
    expect(fs.existsSync(oldfile2)).to.be(true);
    expect(fs.existsSync(oldfile3)).to.be(true);
    expect(fs.existsSync(oldfile4)).to.be(true);
    expect(fs.existsSync(oldfile5)).to.be(true);
    expect(fs.existsSync(oldfile6)).to.be(true);
    expect(fs.existsSync(oldfile7)).to.be(true);
    expect(fs.existsSync(oldfile8)).to.be(true);
    expect(fs.existsSync(oldfile9)).to.be(true);

    for(let i = 0; i < socketsLength; i++) {
      const socketPath = path.join(__dirname, `../logdir/alinode-uds-path-${socketPids[i]}`);
      expect(fs.existsSync(socketPath)).to.be(true);
    }

    await job.run();

    expect(fs.existsSync(oldfile1)).to.be(false);
    expect(fs.existsSync(oldfile2)).to.be(false);
    expect(fs.existsSync(oldfile3)).to.be(false);
    expect(fs.existsSync(oldfile4)).to.be(true);
    expect(fs.existsSync(oldfile5)).to.be(true);
    expect(fs.existsSync(oldfile6)).to.be(true);
    expect(fs.existsSync(oldfile7)).to.be(true);
    expect(fs.existsSync(oldfile8)).to.be(true);
    expect(fs.existsSync(oldfile9)).to.be(true);

    for(let i = 0; i < socketsLength; i++) {
      const socketPath = path.join(__dirname, `../logdir/alinode-uds-path-${socketPids[i]}`);
      expect(fs.existsSync(socketPath)).to.be(false);
    }

    function noop() { }

    fs.unlink(oldfile1, noop);
    fs.unlink(oldfile2, noop);
    fs.unlink(oldfile3, noop);
    fs.unlink(oldfile4, noop);
    fs.unlink(oldfile5, noop);
    fs.unlink(oldfile6, noop);
    fs.unlink(oldfile7, noop);
    fs.unlink(oldfile8, noop);
    fs.unlink(oldfile9, noop);
  });

  it('no logdir should not ok', async function () {
    const job = new CleanLogJob({logdir: ''});
    try {
      await job.run();
    } catch (err) {
      expect(err).to.be.ok();
      expect(err.message).to.be('Not specific logdir in agentx config file');
      return;
    }
    assert.fail();
  });

  it('inexist logdir should not ok', async function () {
    const job = new CleanLogJob({
      logdir: path.join(__dirname, '../logsx')
    });
    try {
      await job.run();
    } catch (err) {
      expect(err).to.be.ok();
      return;
    }
    assert.fail();
  });
});
