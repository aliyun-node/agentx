'use strict';

var path = require('path');
var expect = require('expect.js');
var version = require('../../lib/orders/version');

describe('/lib/orders/version.js', function () {
  before(function () {
    version.init({
      cmddir: path.join(__dirname, '../cmddir')
    });
  });

  it('should ok', function (done) {
    version.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('version');
      expect(params.metrics).to.be.ok();
      var metrics = params.metrics;
      expect(metrics).to.have.property('node');
      done();
    });
  });
});
