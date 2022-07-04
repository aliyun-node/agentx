'use strict';

const fs = require('fs');
const path = require('path');
const expect = require('expect.js');
const errorLog = require('../../lib/orders/error_log');

describe('/lib/orders/error_log.js', function () {

  before(function () {
    errorLog.init({
      error_log: [path.join(__dirname, '../logs', 'error.log')]
    });
  });

  it('should ok with no errors', function (done) {
    errorLog.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('error_log');
      expect(params.metrics).to.be.ok();
      const metrics = params.metrics;
      expect(metrics).to.have.length(0);
      done();
    });
  });

  it('should ok with new errors', function (done) {
    const errPath = path.join(__dirname, '../logs', 'error.log');
    const errbackup = fs.readFileSync(errPath, 'utf8');

    fs.appendFileSync(errPath, errbackup);

    errorLog.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('error_log');
      expect(params.metrics).to.be.ok();
      const metrics = params.metrics;
      expect(metrics).to.have.length(2);
      metrics.forEach(function (item) {
        expect(item.type).to.be('DUPLICATEError');
      });
      fs.writeFileSync(errPath, errbackup);
      done();
    });
  });

  it('should get 2 errors when file size changed to small', function (done) {
    errorLog.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('error_log');
      expect(params.metrics).to.be.ok();
      expect(params.metrics).to.have.length(2);
      done();
    });
  });

  it('should get empty when twice', function (done) {
    errorLog.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('error_log');
      expect(params.metrics).to.be.ok();
      expect(params.metrics).to.have.length(0);
      done();
    });
  });

  describe('empty error logs', function () {
    before(function () {
      errorLog.init({
        error_log: []
      });
    });

    it('should ok', function (done) {
      errorLog.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params).to.be(null);
        done();
      });
    });
  });

  describe('inexist error logs', function () {
    before(function () {
      errorLog.init({
        error_log: [path.join(__dirname, '../logs', 'inexist.log')]
      });
    });

    it('should ok', function (done) {
      errorLog.run(function (err) {
        expect(err).to.not.be.ok();
        done();
      });
    });
  });

  describe('when path is folder error logs', function () {
    before(function () {
      errorLog.init({
        error_log: [path.join(__dirname, '../logs', 'folder')]
      });
    });

    it('should ok', function (done) {
      errorLog.run(function (err) {
        expect(err).to.be.ok();
        expect(err.message).to.contain('is not a file');
        done();
      });
    });
  });
});
