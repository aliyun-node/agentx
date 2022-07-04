'use strict';

const fs = require('fs');
const path = require('path');

const expect = require('expect.js');
const rewire = require('rewire');
const mm = require('mm');

const helper = require('../../lib/utils');

const tracingLog = rewire('../../lib/orders/tracing_log');

xdescribe('/lib/orders/tracing_log.js', function () {
  before(function () {
    mm(helper, 'getYYYYMMDD', function () {
      return '20180515';
    });

    tracingLog.init({
      logdir: path.join(__dirname, '../logdir')
    });
  });

  after(function () {
    mm.restore();
  });

  it('should ok', function (done) {
    // backup logfile
    const logPath = path.join(__dirname, '../logdir/tracing-20180515.log');
    const log = fs.readFileSync(logPath, 'utf8');

    tracingLog.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('tracing_log');
      expect(params.metrics).to.be.ok();
      const metrics = params.metrics;
      expect(metrics.ok).to.be.ok();
      expect(metrics.data).to.have.length(0);
      metrics.data.forEach(function (item) {
        expect(item.pid).to.be('45020');
      });
    });

    const append = '{"traceId":"1e28345415263728868931001d0660","spanId":"1e28345415263728868931002d0660","parentSpanId":"1e28345415263728868921000d0660","operationName":"child_span1","startTime":1526372886893,"rootTime":1526372886892,"duration":8713,"logs":[{"startTimeFromFullTrace":1,"logMessage":{"state":"timer1"}}],"tags":[{"timeout":8708.907699750824}]}\n'
      + 'dashboard $ cat /tmp/node-20151209.log\n'
      + '{"traceId":"1e28345415263728868931001d0660","spanId":"1e28345415263728868931003d0660","parentSpanId":"1e28345415263728868921000d0660","operationName":"child_span1","startTime":1526372886893,"rootTime":1526372886892,"duration":9751,"logs":[{"startTimeFromFullTrace":1,"logMessage":{"state":"timer1"}}],"tags":[{"timeout":9746.823575296385}]}\n'
      + '{"traceId":"1e28345415263728868931001d0660","spanId":"1e28345415263728966441004d0660","parentSpanId":"1e28345415263728868921000d0660","operationName":"child_span2","startTime":1526372896644,"rootTime":1526372886892,"duration":3003,"logs":[{"startTimeFromFullTrace":9752,"logMessage":{"state":"timer2"}}],"tags":[{"timeout":"3s"}]}\n'
      + '{"traceId":"1e28345415263728868931001d0660","spanId":"1e28345415263728996481005d0660","parentSpanId":"1e28345415263728868921000d0660","operationName":"child_span3","startTime":1526372899648,"rootTime":1526372886892,"duration":38,"logs":[{"startTimeFromFullTrace":12756,"logMessage":{"state":"rpc"}}],"tags":[{"http request":"http://47.100.164.242/we"}]}\n'
      + '{"traceId":"1e28345415263728868931001d0660","spanId":"1e28345415263728868921000d0660","parentSpanId":null,"operationName":"root request","startTime":1526372886892,"rootTime":1526372886892,"duration":12797,"logs":[{"startTimeFromFullTrace":1,"logMessage":{"state":"start"}}],"tags":[]}\n'
      + 'dashboard $ cat /tmp/node-20151209.log\n';

    // append sth
    fs.appendFileSync(logPath, append);

    tracingLog.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('tracing_log');
      expect(params.metrics).to.be.ok();
      const metrics = params.metrics;
      expect(metrics.ok).to.be.ok();
      expect(metrics.data).to.have.length(5);
      metrics.data.forEach(function (item) {
        expect(item.traceId).to.be('1e28345415263728868931001d0660');
      });

      // append array
      const append2 = '[{"traceId":"1e28345415263728868931001d0661","spanId":"1e28345415263728868931002d0660","parentSpanId":"1e28345415263728868921000d0660","operationName":"child_span1","startTime":1526372886893,"rootTime":1526372886892,"duration":8713,"logs":[{"startTimeFromFullTrace":1,"logMessage":{"state":"timer1"}}],"tags":[{"timeout":8708.907699750824}]},'
        + '"dashboard $ cat /tmp/node-20151210.log",'
        + '{"traceId":"1e28345415263728868931001d0661","spanId":"1e28345415263728868931003d0660","parentSpanId":"1e28345415263728868921000d0660","operationName":"child_span1","startTime":1526372886893,"rootTime":1526372886892,"duration":9751,"logs":[{"startTimeFromFullTrace":1,"logMessage":{"state":"timer1"}}],"tags":[{"timeout":9746.823575296385}]},'
        + '{"traceId":"1e28345415263728868931001d0661","spanId":"1e28345415263728966441004d0660","parentSpanId":"1e28345415263728868921000d0660","operationName":"child_span2","startTime":1526372896644,"rootTime":1526372886892,"duration":3003,"logs":[{"startTimeFromFullTrace":9752,"logMessage":{"state":"timer2"}}],"tags":[{"timeout":"3s"}]},'
        + '{"traceId":"1e28345415263728868931001d0661","spanId":"1e28345415263728996481005d0660","parentSpanId":"1e28345415263728868921000d0660","operationName":"child_span3","startTime":1526372899648,"rootTime":1526372886892,"duration":38,"logs":[{"startTimeFromFullTrace":12756,"logMessage":{"state":"rpc"}}],"tags":[{"http request":"http://47.100.164.242/we"}]},'
        + '{"traceId":"1e28345415263728868931001d0661","spanId":"1e28345415263728868921000d0660","parentSpanId":null,"operationName":"root request","startTime":1526372886892,"rootTime":1526372886892,"duration":12797,"logs":[{"startTimeFromFullTrace":1,"logMessage":{"state":"start"}}],"tags":[]},'
        + '"dashboard $ cat /tmp/node-20151210.log"]\n';

      fs.appendFileSync(logPath, append2);

      tracingLog.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('tracing_log');
        expect(params.metrics).to.be.ok();
        const metrics = params.metrics;
        expect(metrics.ok).to.be.ok();
        expect(metrics.data).to.have.length(5);
        metrics.data.forEach(function (item) {
          expect(item.traceId).to.be('1e28345415263728868931001d0661');
        });

        // crossover date
        mm(helper, 'getYYYYMMDD', function () {
          return '20180517';
        });

        tracingLog.run(function (err, params) {
          expect(err).not.to.be.ok();
          expect(params.type).to.be('tracing_log');
          expect(params.metrics).to.be.ok();
          const metrics = params.metrics;
          expect(metrics.ok).to.be.ok();
          expect(metrics.data).to.have.length(5);
          metrics.data.forEach(function (item) {
            expect(item.traceId).to.be('1e28345415263728868931001d0662');
          });
        });

        // restore log file
        fs.writeFileSync(logPath, log);
        mm(helper, 'getYYYYMMDD', function () {
          return '20180515';
        });
        done();
      });
    });
  });

  it('should ok with no change', function (done) {
    tracingLog.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('tracing_log');
      expect(params.metrics).to.be.ok();
      const metrics = params.metrics;
      expect(metrics.ok).to.be.ok();
      expect(metrics.data).to.have.length(5);
      done();
    });
  });

  it('getCurrentLogPath should ok', function () {
    const getCurrentLogPath = tracingLog.__get__('getCurrentLogPath');
    const logPath = path.join(__dirname, '../logdir/tracing-20180515.log');
    expect(getCurrentLogPath()).to.be(logPath);
  });

  describe('tracing log error', function () {
    before(function () {
      mm(helper, 'getYYYYMMDD', function () {
        return '20180516';
      });

      tracingLog.init({
        logdir: path.join(__dirname, '../logdir')
      });
    });

    after(function () {
      mm.restore();
    });

    it('should not ok', function (done) {
      tracingLog.run(function (err) {
        expect(err).to.be.ok();
        expect(err.message.includes('is not a file')).to.be(true);
        done();
      });
    });
  });

  describe('no logdir', function () {
    before(function () {
      tracingLog.logdir = '';
    });

    it('should ok', function (done) {
      tracingLog.run(function (err) {
        expect(err).to.be.ok();
        expect(err.message).to.be('Not specific logdir in agentx config file');
        done();
      });
    });
  });

  describe('inexist logdir', function () {
    before(function () {
      tracingLog.init({
        logdir: path.join(__dirname, '../logsx')
      });
    });

    it('should ok', function (done) {
      tracingLog.run(function (err) {
        expect(err).to.not.be.ok();
        done();
      });
    });
  });
});
