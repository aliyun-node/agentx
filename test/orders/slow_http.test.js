'use strict';

var path = require('path');

var expect = require('expect.js');
var rewire = require('rewire');
var mm = require('mm');

var helper = require('../../lib/utils');

var slowHttp = rewire('../../lib/orders/slow_http');

describe('/lib/orders/slow_http.js', function () {
  before(function () {
    mm(helper, 'getYYYYMMDD', function () {
      return '20160229';
    });

    slowHttp.init({
      logdir: path.join(__dirname, '../logdir')
    });
  });

  after(function () {
    mm.restore();
  });

  it('should ok', function (done) {
    slowHttp.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('slow_http');
      expect(params.metrics).to.be.ok();
      var metrics = params.metrics;
      expect(metrics).to.have.length(4);
      metrics.forEach(function (item) {
        expect(item).to.have.property('timestamp');
        expect(item).to.have.property('from');
        expect(item).to.have.property('type');
        expect(item).to.have.property('to');
        expect(item).to.have.property('method');
        expect(item).to.have.property('url');
        expect(item).to.have.property('protocol');
        expect(item).to.have.property('code');
        expect(item).to.have.property('rt');
      });
      done();
    });
  });

  it('getSlowHTTPLog should ok', function () {
    var line = '[2016-02-29T09:09:53.988Z] ::ffff:127.0.0.1 -> ' +
      'dev.node.test.com "GET /home/apps/13/ HTTP/1.1 200" 811';
    var getSlowHTTPLog = slowHttp.__get__('getSlowHTTPLog');
    var parsed = getSlowHTTPLog([line]);
    expect(parsed).to.have.length(1);
    var struct = parsed[0];
    expect(struct).to.have.property('timestamp', '2016-02-29T09:09:53.988Z');
    expect(struct).to.have.property('from', '::ffff:127.0.0.1');
    expect(struct).to.have.property('type', 'receive');
    expect(struct).to.have.property('to', 'dev.node.test.com');
    expect(struct).to.have.property('method', 'GET');
    expect(struct).to.have.property('url', '/home/apps/13/');
    expect(struct).to.have.property('protocol', 'HTTP/1.1');
    expect(struct).to.have.property('code', 200);
    expect(struct).to.have.property('rt', 811);
  });

  it('getCurrentLogPath should ok', function () {
    var getCurrentLogPath = slowHttp.__get__('getCurrentLogPath');
    var logPath = path.join(__dirname, '../logdir/access-20160229.log');
    expect(getCurrentLogPath()).to.be(logPath);
  });

  describe('no logdir', function () {
    before(function () {
      slowHttp.logdir = '';
    });

    it('should ok', function (done) {
      slowHttp.run(function (err) {
        expect(err).to.be.ok();
        expect(err.message).to.be('Not specific logdir in agentx config file');
        done();
      });
    });
  });
});
