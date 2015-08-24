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
});
