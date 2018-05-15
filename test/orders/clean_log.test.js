'use strict';

var fs = require('fs');
var path = require('path');

var expect = require('expect.js');
var rewire = require('rewire');
var mm = require('mm');

var helper = require('../../lib/utils');

var cleaner = rewire('../../lib/orders/clean_log');

var oldfile1 = path.join(__dirname, '../logdir/node-20180225.log');
var oldfile2 = path.join(__dirname, '../logdir/access-20180225.log');
var oldfile3 = path.join(__dirname, '../logdir/npp-tracing-20180225.log');
var oldfile4 = path.join(__dirname, '../logdir/node-20180226.log');
var oldfile5 = path.join(__dirname, '../logdir/access-20180226.log');
var oldfile6 = path.join(__dirname, '../logdir/npp-tracing-20180226.log');
var oldfile7 = path.join(__dirname, '../logdir/node-20180227.log');
var oldfile8 = path.join(__dirname, '../logdir/access-20180227.log');
var oldfile9 = path.join(__dirname, '../logdir/npp-tracing-20180227.log');

// the inexist file
var oldfile10 = path.join(__dirname, '../logdir/node-20151202.log');

describe('/lib/orders/clean_log.js', function () {
  before(function () {
    mm(helper, 'getYYYYMMDD', function () {
      return '20180305';
    });

    cleaner.init({
      logdir: path.join(__dirname, '../logdir')
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
  });

  after(function () {
    mm.restore();
  });

  it('should ok', function (done) {
    expect(fs.existsSync(oldfile1)).to.be(true);
    expect(fs.existsSync(oldfile2)).to.be(true);
    expect(fs.existsSync(oldfile3)).to.be(true);
    expect(fs.existsSync(oldfile4)).to.be(true);
    expect(fs.existsSync(oldfile5)).to.be(true);
    expect(fs.existsSync(oldfile6)).to.be(true);
    expect(fs.existsSync(oldfile7)).to.be(true);
    expect(fs.existsSync(oldfile8)).to.be(true);
    expect(fs.existsSync(oldfile9)).to.be(true);
    cleaner.run(function (err) {
      expect(err).not.to.be.ok();
      expect(fs.existsSync(oldfile1)).to.be(false);
      expect(fs.existsSync(oldfile2)).to.be(false);
      expect(fs.existsSync(oldfile3)).to.be(false);
      expect(fs.existsSync(oldfile4)).to.be(true);
      expect(fs.existsSync(oldfile5)).to.be(true);
      expect(fs.existsSync(oldfile6)).to.be(true);
      expect(fs.existsSync(oldfile7)).to.be(true);
      expect(fs.existsSync(oldfile8)).to.be(true);
      expect(fs.existsSync(oldfile9)).to.be(true);

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

      done();
    });
  });

  it('removeFiles should ok', function (done) {
    var removeFiles = cleaner.__get__('removeFiles');
    var logdir = path.join(__dirname, '../logdir');
    removeFiles(logdir, [], function (err) {
      done(err);
    });
  });

  it('removeFiles should ok with inexist file', function (done) {
    var removeFiles = cleaner.__get__('removeFiles');
    var logdir = path.join(__dirname, '../logdir');
    removeFiles(logdir, [oldfile10], function (err) {
      expect(err).to.be.ok();
      expect(err.code).to.be('ENOENT');
      done();
    });
  });

  describe('no logdir', function () {
    before(function () {
      cleaner.logdir = '';
    });

    it('should ok', function (done) {
      cleaner.run(function (err) {
        expect(err).to.be.ok();
        expect(err.message).to.be('Not specific logdir in agentx config file');
        done();
      });
    });
  });

  describe('inexist logdir', function () {
    before(function () {
      cleaner.init({
        logdir: path.join(__dirname, '../logsx')
      });
    });

    it('should ok', function (done) {
      cleaner.run(function (err) {
        expect(err).to.be.ok();
        done();
      });
    });
  });
});
