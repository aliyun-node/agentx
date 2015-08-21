'use strict';

var expect = require('expect.js');
var system = require('../../lib/orders/system');

describe('/lib/orders/system.js', function () {
  it('should ok', function (done) {
    system.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('system');
      expect(params.metrics).to.be.ok();
      var metrics = params.metrics;
      expect(metrics).to.have.key('uptime');
      done();
    });
  });
});
