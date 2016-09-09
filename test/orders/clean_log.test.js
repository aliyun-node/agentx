'use strict';

var fs = require('fs');
var path = require('path');

var expect = require('expect.js');
var rewire = require('rewire');
var mm = require('mm');

var helper = require('../../lib/utils');

var cleaner = rewire('../../lib/orders/clean_log');

var oldfile1 = path.join(__dirname, '../logdir/node-20151201.log');
var oldfile2 = path.join(__dirname, '../logdir/access-20151201.log');
// the inexist file
var oldfile3 = path.join(__dirname, '../logdir/node-20151202.log');

describe('/lib/orders/clean_log.js', function () {
  before(function () {
    mm(helper, 'getYYYYMMDD', function () {
      return '20151209';
    });

    cleaner.init({
      logdir: path.join(__dirname, '../logdir')
    });

    fs.writeFileSync(oldfile1, 'empty file');
    fs.writeFileSync(oldfile2, 'empty file');
  });

  after(function () {
    mm.restore();
  });

  it('should ok', function (done) {
    expect(fs.existsSync(oldfile1)).to.be(true);
    expect(fs.existsSync(oldfile2)).to.be(true);
    cleaner.run(function (err) {
      expect(err).not.to.be.ok();
      expect(fs.existsSync(oldfile1)).to.be(false);
      expect(fs.existsSync(oldfile2)).to.be(false);
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
    removeFiles(logdir, [oldfile3], function (err) {
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
