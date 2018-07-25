'use strict';

var expect = require('expect.js');
var mm = require('mm');
var checkHealth = require('../../lib/orders/check_health');
var exitCode = -1;
var exitStatus = false;
var memoryLimit = checkHealth.memoryLimit;

describe('/lib/orders/check_health.js', function () {
  before(function () {
    mm(process, 'exit', function (code) {
      exitStatus = true;
      exitCode = code;
    });
  });

  describe(`should not execute process.exit(0) when rss <= ${memoryLimit / 1024 / 1024}M`, function () {
    before(function () {
      mm(process, 'memoryUsage', function () {
        return {
          rss: memoryLimit
        };
      });
    });
    it('should ok', function () {
      checkHealth.run();
      expect(exitStatus).to.be(false);
      expect(exitCode).to.be(-1);
    });
  });

  describe(`should execute process.exit(0) when rss > ${memoryLimit / 1024 / 1024}M`, function () {
    before(function () {
      mm(process, 'memoryUsage', function () {
        return {
          rss: memoryLimit + 1
        };
      });
    });
    it('should ok', function () {
      checkHealth.run();
      expect(exitStatus).to.be(true);
      expect(exitCode).to.be(0);
    });
  });

  after(function () {
    mm.restore();
  });
});