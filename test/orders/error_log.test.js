'use strict';

var path = require('path');
var expect = require('expect.js');
var errorLog = require('../../lib/orders/error_log');

describe('/lib/orders/error_log.js', function () {
  before(function () {
    errorLog.init({
      error_log: [path.join(__dirname, '../logs', 'error.log')]
    });
  });

  it('should ok', function (done) {
    errorLog.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('error_log');
      expect(params.metrics).to.be.ok();
      var metrics = params.metrics;
      expect(metrics).to.have.length(2);
      metrics.forEach(function (item) {
        expect(item.type).to.be('DUPLICATEError');
      });
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
        expect(err).to.be.ok();
        expect(err.code).to.be('ENOENT');
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
