'use strict';

var path = require('path');
var expect = require('expect.js');
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
});
