'use strict';

const path = require('path');
const expect = require('expect.js');
const mm = require('mm');
const counter = require('../../lib/orders/processes_count');

describe('/lib/orders/processes_count.js', function () {
  before(function () {
    counter.init({
      cmddir: path.join(__dirname, '../cmddir')
    });
  });

  it('should ok', function (done) {
    counter.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('processes_count');
      expect(params.metrics).to.be.ok();
      const metrics = params.metrics;
      expect(metrics).to.have.property('node_count');
      expect(metrics.node_count).to.be.a('number');
      expect(metrics.node_count).to.be.above(0);
      done();
    });
  });

  describe('command invalid', function () {
    before(function () {
      mm(require('../../lib/utils'), 'execFile', function (command, args, callback) {
        process.nextTick(function () {
          callback(new Error('mock error'));
        });
      });
    });

    after(function () {
      mm.restore();
    });

    it('should ok', function (done) {
      counter.run(function (err) {
        expect(err).to.be.ok();
        expect(err.message).to.be('mock error');
        done();
      });
    });
  });
});
