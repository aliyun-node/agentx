'use strict';

var mm = require('mm');
var fs = require('fs');
var path = require('path');
var expect = require('expect.js');
var listCore = require('../../lib/orders/list_core');

describe('/lib/orders/list_core.js', function () {
  if (require('os').platform() !== 'linux') {
    return;
  }

  before(function () {
    mm(require('child_process'), 'exec', function(cmd, callback){callback(null, '');});
    delete require.cache[require.resolve('../../lib/orders/list_core')];
    delete require.cache[require.resolve('child_process')];
    listCore = require('../../lib/orders/list_core');
    console.log(require('child_process').exec.toString());
  });

  it('no coredirs', function (done) {
    listCore.init({coredir: []});
    listCore.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('coredump');
      expect(params.metrics).to.be(null);
      done();
    });
  });

  after(function() {
    mm.restore();
    delete require.cache[require.resolve('../../lib/orders/list_core')];
    delete require.cache[require.resolve('child_process')];
    listCore = require('../../lib/orders/list_core');
  });
});



describe('/lib/orders/list_core.js', function () {
  if (require('os').platform() !== 'linux') {
    return;
  }

  var mock =  {
    isFile: function() { return true; },
    dev: 2053,
    mode: 16893,
    nlink: 2,
    uid: 1000,
    gid: 1000,
    rdev: 0,
    blksize: 4096,
    ino: 2367914,
    size: 4096,
    blocks: 8,
    atimeMs: 1522831557878.927,
    mtimeMs: 1522831557778.928 - 70000,
    ctimeMs: 1522831557778.928 - 70000,
    birthtimeMs: 1522831557778.928,
    atime: '2018-04-04T08:45:57.879Z',
    mtime: '2018-04-04T08:45:57.779Z',
    ctime: '2018-04-04T08:45:57.779Z',
    birthtime: '2018-04-04T08:45:57.779Z'
  };

  before(function () {
    mm.data(require('fs'), 'stat', mock);
  });

  it('core created before agentx startup will not reported', function (done) {
    var dir = path.join(__dirname, '../logdir');
    var corePath = path.join(dir, 'core.123');
    fs.writeFileSync(corePath, '');
    listCore.init({coredir: [path.join(__dirname, '../logdir')]});

    listCore.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('coredump');
      expect(params.metrics).to.be.ok();
      expect(params.metrics.data.length).to.be(0);
      done();
      fs.unlinkSync(corePath);
    });
  });

  after(function() {
    mm.restore();
  });

});


describe('/lib/orders/list_core.js', function () {
  if (require('os').platform() !== 'linux') {
    return;
  }

  it('should ok coredir not specified', function (done) {
    setTimeout(function() {
      listCore.init({coredir: []});
      listCore.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('coredump');
        expect(params.metrics).to.be.ok();
        expect(params.metrics.data.length).to.be(0);
        done();
      });
    }, 30);
  });
});


describe('/lib/orders/list_core.js', function () {
  if (require('os').platform() !== 'linux') {
    return;
  }

  it('should ok when specify the coredir', function (done) {
    var dir = path.join(__dirname, '../logdir');
    var corePath = path.join(dir, 'core.123');
    setTimeout(function() {
      listCore.init({coredir: [path.join(__dirname, '../logdir')]});
      fs.writeFileSync(corePath, '');
      listCore.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('coredump');
        expect(params.metrics).to.be.ok();
        expect(params.metrics.data.length).to.be(1);
        expect(params.metrics.data[0].path).to.be(corePath);
        done();
        fs.unlinkSync(corePath);
      });
    }, 30);
  });
});


describe('/lib/orders/list_core.js', function () {
  if (require('os').platform() !== 'linux') {
    return;
  }

  it('should ok when coredir not exists', function (done) {
    setTimeout(function() {
      listCore.init({coredir: [path.join(__dirname, '../non-logdir')]});
      listCore.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('coredump');
        expect(params.metrics).to.be.ok();
        expect(params.metrics.data.length).to.be(0);
        done();
      });
    }, 30);
  });
});


describe('/lib/orders/list_core.js', function () {
  if (require('os').platform() !== 'linux') {
    return;
  }

  it('should ok when duplicate dir configured', function (done) {
    var dir = path.join(__dirname, '../logdir');
    var corePath = path.join(dir, 'core.123');
    setTimeout(function() {
      var d = path.join(__dirname, '../logdir');
      listCore.init({coredir: [d, d, d]});
      fs.writeFileSync(corePath, '');
      listCore.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('coredump');
        expect(params.metrics).to.be.ok();
        expect(params.metrics.data.length).to.be(1);
        expect(params.metrics.data[0].path).to.be(corePath);
        done();
        fs.unlinkSync(corePath);
      });
    }, 30);
  });
});

describe('should ok when coredir specified by /proc/sys/kernel/core_pattern', function () {
  if (require('os').platform() !== 'linux') {
    return;
  }

  var dir = path.join(__dirname, '../logdir');
  var corePath1 = path.join(dir, 'core.12345');
  var corePath2 = path.join(dir, 'coredump_12345');
  var corePath3 = path.join(dir, 'coredump_23456');
  var mock =  path.join(dir, 'coredump_%e_%P');
  before(function () {
    mm.syncData(require('fs'), 'readFileSync', mock);
  });

  it('should ok when specify the core dir', function (done) {

    setTimeout(function(){
      listCore.init();
      fs.writeFileSync(corePath1, '');
      fs.writeFileSync(corePath2, '');
      fs.writeFileSync(corePath3, '');
      listCore.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('coredump');
        expect(params.metrics).to.be.ok();
        expect(params.metrics.data.length).to.be(3);
        var cores = params.metrics.data;
        var paths = [cores[0].path, cores[1].path, cores[2].path];
        expect(paths.indexOf(corePath1)).not.to.be(-1);
        expect(paths.indexOf(corePath2)).not.to.be(-1);
        expect(paths.indexOf(corePath3)).not.to.be(-1);
        done();
        fs.unlinkSync(corePath1);
        fs.unlinkSync(corePath2);
        fs.unlinkSync(corePath3);
      });
    }, 60);

  });

  after(function() {
    mm.restore();
  });
});

describe('should ok when core dumped to PWD', function () {
  if (require('os').platform() !== 'linux') {
    return;
  }

  var corePath = path.join(process.env.PWD, 'core.56789');

  it('should ok when specify the core dir', function (done) {
    listCore.init();
    console.log('cordir:', listCore.coredir);

    fs.writeFileSync(corePath, '');
    setTimeout(function() {
      console.log(corePath, fs.existsSync(corePath));
      listCore.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('coredump');
        expect(params.metrics).to.be.ok();
        // expect(params.metrics.data.length).to.be(1);
        // expect(params.metrics.data[0].path).to.be(corePath);
        done();
        fs.unlinkSync(corePath);
      });

    }, 90);
  });

  after(function() {
    mm.restore();
  });
});
