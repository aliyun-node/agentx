'use strict';

var path = require('path');
var expect = require('expect.js');
var utils = require('../lib/utils');

describe('/lib/utils', function () {
  it('random should ok', function () {
    var val = utils.random(100, 200);
    expect(val).to.be.below(200);
    expect(val).to.be.above(100);
  });

  it('uid should ok', function () {
    var uid1 = utils.uid();
    var uid2 = utils.uid();
    expect(uid2 - uid1).to.be(1);
  });

  it('sha1 should ok', function () {
    var sign = utils.sha1('str', 'key');
    expect(sign).to.be('f6f02bd6ba49b28f3df40822efe7291a57f42ca2');
  });

  it('exec should ok', function (done) {
    var sh = path.join(__dirname, "cmddir", "echo.sh");
    utils.execCommand(sh, ['hehe'], {}, function (err, stdout, stderr) {
      expect(err).to.not.be.ok();
      expect(stdout).to.be('hehe' + require('os').EOL);
      expect(stderr).to.be('');
      done();
    });
  });

  it('getYYYYMMDD should ok', function () {
    var date = new Date();
    date.setFullYear(1987);
    date.setMonth(9);
    date.setDate(12);
    expect(utils.getYYYYMMDD(date)).to.be('19871012');
    var date = new Date();
    date.setFullYear(1987);
    date.setMonth(0);
    date.setDate(1);
    expect(utils.getYYYYMMDD(date)).to.be('19870101');
  });
});
