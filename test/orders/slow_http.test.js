'use strict';

const path = require('path');

const expect = require('expect.js');
const rewire = require('rewire');
const mm = require('mm');

const helper = require('../../lib/utils');

const slowHttp = rewire('../../lib/orders/slow_http');

describe('/lib/orders/slow_http.js', function () {
  before(function () {
    mm(helper, 'getYYYYMMDD', function () {
      return '20180301';
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
      const metrics = params.metrics;
      expect(metrics).to.have.length(2);
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

  it('should ok with run again', function (done) {
    slowHttp.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params).to.be(null);
      done();
    });
  });

  it('getSlowHTTPLog should ok', function () {
    const line0 = '[2016-02-29T09:09:53.988Z] ::ffff:127.0.0.1 -> ' +
      'dev.node.test.com "GET /home/apps/13/ HTTP/1.1 200" 811';
    const line1 = '[2016-02-29T09:09:53.988Z] ::ffff:127.0.0.1 -> ' +
      'dev.node.test.com "GET /home/apps/13/ HTTP/1.1 200" 810';
    const line2 = '[2016-02-29T09:09:53.988Z] ::ffff:127.0.0.1 -> ' +
      'dev.node.test.com "GET /home/apps/13/ HTTP/1.1 200" 809';
    const line3 = '[2016-02-29T09:09:53.988Z] ::ffff:127.0.0.1 -> ' +
      'dev.node.test.com "GET /home/apps/13/ HTTP/1.1 200" 807';
    const line4 = '[2016-02-29T09:09:53.988Z] ::ffff:127.0.0.1 -> ' +
      'dev.node.test.com "GET /home/apps/13/ HTTP/1.1 200" 808';
    const line5 = '[2016-02-29T09:09:53.988Z] ::ffff:127.0.0.1 <- ' +
      'dev.node.test.com "GET /home/apps/13/ HTTP/1.1 200" 806';
    const getSlowHTTPLog = slowHttp.__get__('getSlowHTTPLog');
    const parsed = getSlowHTTPLog([line0, line1, line2, line3, line4, line5]);
    expect(parsed).to.have.length(2);
    const struct = parsed[0];
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
    const getCurrentLogPath = slowHttp.__get__('getCurrentLogPath');
    const logPath = path.join(__dirname, '../logdir/access-20180301.log');
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

  describe('inexist logdir', function () {
    before(function () {
      slowHttp.init({
        logdir: path.join(__dirname, '../logsx')
      });
    });

    it('should ok', function (done) {
      slowHttp.run(function (err) {
        expect(err).to.not.be.ok();
        done();
      });
    });
  });

  it('sortByRT should ok', function () {
    const sortByRT = slowHttp.__get__('sortByRT');
    const a = [{rt: 10}, {rt: 12}, {rt: 5}, {rt: 5}];
    a.sort(sortByRT);
    expect(a).to.eql([ { rt: 12 }, { rt: 10 }, { rt: 5 }, {rt: 5} ]);
  });
});
