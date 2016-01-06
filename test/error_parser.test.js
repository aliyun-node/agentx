'use strict';

var path = require('path');
var fs = require('fs');

var expect = require('expect.js');
var Parser = require('../lib/error_parser');

describe('/lib/error_parser', function () {
  it('new Parser should ok', function () {
    var parser = new Parser(10);
    expect(parser.limit).to.be(10);
  });

  it('parse should ok', function (done) {
    var logPath = path.join(__dirname, 'logs/error.log');
    var readable = fs.createReadStream(logPath);
    Parser.parse(readable, 10, function (err) {
      expect(err).not.to.be.ok();
      done();
    });
  });
});
