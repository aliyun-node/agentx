'use strict';

var mm = require('mm');
var fs = require('fs');
var path = require('path');
var expect = require('expect.js');
var listCore = require('../../lib/orders/list_core');

describe('/lib/orders/list_core.js', function () {
  before(function () {
    listCore.init({
      coredir: [path.join(__dirname, '../logdir')]
    });
  });

  it('should ok when specify the coredir', function (done) {
    var dir = path.join(__dirname, '../logdir');
    var corePath = path.join(dir, 'core.123');
    fs.writeFileSync(corePath, '');

    listCore.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('corelist');
      expect(params.core).to.be.ok();
      expect(params.core.data[0].path).to.be(corePath);
      done();
    });
    fs.unlinkSync(corePath);
  });
});


describe('should ok when coredir specified by /proc/sys/kernel/core_pattern', function () {
  var dir = path.join(__dirname, '../logdir');
  var corePath1 = path.join(dir, 'core.12345');
  var corePath2 = path.join(dir, 'coredump_12345');
  var corePath3 = path.join(dir, 'coredump_2356');
  fs.writeFileSync(corePath1, '');
  fs.writeFileSync(corePath2, '');
  fs.writeFileSync(corePath3, '');

  var mock =  path.join(dir, "coredump_%e_%P");

  before(function () {
    mm.syncData(require('fs'), 'readFileSync', mock);
  });


  it('should ok when specify the core dir', function (done) {
    listCore.init();
    listCore.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('corelist');
      expect(params.core).to.be.ok();
      expect(params.core.data[0].path).to.be(corePath2);
      expect(params.core.data[1].path).to.be(corePath3);
      done();
    });
  });

  after(function() {
    mm.restore();
    fs.unlinkSync(corePath1);
    fs.unlinkSync(corePath2);
    fs.unlinkSync(corePath3);
  });
});
