'use strict';

const path = require('path');
const fs = require('fs');

const expect = require('expect.js');
const Parser = require('../lib/error_parser');

describe('/lib/error_parser', function () {
  it('new Parser should ok', function () {
    const parser = new Parser(10);
    expect(parser.limit).to.be(10);
  });

  it('parse should ok', function (done) {
    const logPath = path.join(__dirname, 'logs/error.log');
    const readable = fs.createReadStream(logPath);
    Parser.parse(readable, 1, function (err, list) {
      expect(err).not.to.be.ok();
      expect(list).to.be.ok();
      expect(list).to.have.length(1);
      done();
    });
  });

  it('parse without limit should ok', function (done) {
    const logPath = path.join(__dirname, 'logs/error.log');
    const readable = fs.createReadStream(logPath);
    Parser.parse(readable, function (err, list) {
      expect(err).not.to.be.ok();
      expect(list).to.be.ok();
      expect(list).to.have.length(2);
      done();
    });
  });
});
