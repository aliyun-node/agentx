'use strict';

var path = require('path');
var expect = require('expect.js');
var pack = require('../../lib/orders/package');

describe('/lib/orders/package.js', function () {
  before(function () {
    pack.init({
      packages: [
        path.join(__dirname, '..', '../package.json'),
        path.join(__dirname, '..', 'fixtures/package.json')
      ]
    });
  });

  it('should ok', function (done) {
    pack.run(function (err, params) {
      expect(err).not.to.be.ok();
      expect(params.type).to.be('package');
      expect(params.metrics).to.be.ok();
      var metrics = params.metrics;
      expect(Array.isArray(metrics)).to.be.ok();
      expect(metrics.length > 0).to.be.ok();
      metrics.forEach(function (metric) {
        expect(metric).to.have.property('path');
        expect(metric).to.have.property('dependencies');
        expect(metric).to.have.property('devDependencies');
      });
      done();
    });
  });

  describe('empty packages', function () {
    before(function () {
      pack.init({
        packages: []
      });
    });

    it('should ok', function (done) {
      pack.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params).not.to.be.ok();
        done();
      });
    });
  });

  describe('invalid packages', function () {
    before(function () {
      pack.init({
        packages: [path.join(__dirname, '..', '../invalid.json')]
      });
    });

    it('should ok', function (done) {
      pack.run(function (err) {
        expect(err).to.be.ok();
        done();
      });
    });
  });

  describe('multi invalid packages', function () {
    before(function () {
      pack.init({
        packages: [
          path.join(__dirname, '..', '../invalid.json'),
          path.join(__dirname, '..', '../invalid2.json')
        ]
      });
    });

    it('should ok', function (done) {
      pack.run(function (err) {
        expect(err).to.be.ok();
        done();
      });
    });
  });

  describe('non-well-json', function () {
    before(function () {
      pack.init({
        packages: [
          path.join(__dirname, '..', 'fixtures/invalid.json')
        ]
      });
    });

    it('should ok', function (done) {
      pack.run(function (err) {
        expect(err).to.be.ok();
        done();
      });
    });
  });
});

