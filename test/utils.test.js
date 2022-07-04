'use strict';

const path = require('path');
const os = require('os');
const mm = require('mm');
const expect = require('expect.js');
const utils = require('../lib/utils');

describe('/lib/utils', function () {
  it('random should ok', function () {
    const val = utils.random(100, 200);
    expect(val).to.be.below(200);
    expect(val).to.be.above(99);
  });

  it('uid should ok', function () {
    const uid1 = utils.uid();
    const uid2 = utils.uid();
    expect(uid2 - uid1).to.be(1);
  });

  it('sha1 should ok', function () {
    const sign = utils.sha1('str', 'key');
    expect(sign).to.be('f6f02bd6ba49b28f3df40822efe7291a57f42ca2');
  });

  it('exec should ok', function (done) {
    const sh = path.join(__dirname, 'cmddir', 'echo.sh');
    utils.execCommand(sh, ['hehe'], {}, function (err, stdout, stderr) {
      expect(err).to.not.be.ok();
      expect(stdout).to.be('hehe' + require('os').EOL);
      expect(stderr).to.be('');
      done();
    });
  });

  it('execFile should ok', function (done) {
    const sh = path.join(__dirname, 'cmddir', 'no_permission');
    utils.execFile(sh, function (err, stdout, stderr) {
      expect(err).to.be.ok();
      expect(err.code).to.be('EACCES');
      done();
    });
  });

  it('getYYYYMMDD should ok', function () {
    let date = new Date();
    date.setFullYear(1987);
    date.setMonth(9);
    date.setDate(12);
    expect(utils.getYYYYMMDD(date)).to.be('19871012');
    date = new Date();
    date.setFullYear(1987);
    date.setMonth(0);
    date.setDate(1);
    expect(utils.getYYYYMMDD(date)).to.be('19870101');
  });

  it('pad2 should ok', function () {
    expect(utils.pad2(0)).to.be('00');
    expect(utils.pad2(1)).to.be('01');
    expect(utils.pad2(10)).to.be('10');
    expect(utils.pad2(99)).to.be('99');
  });

  it('pad3 should ok', function () {
    expect(utils.pad3(0)).to.be('000');
    expect(utils.pad3(1)).to.be('001');
    expect(utils.pad3(10)).to.be('010');
    expect(utils.pad3(99)).to.be('099');
    expect(utils.pad3(99)).to.be('099');
    expect(utils.pad3(999)).to.be('999');
  });

  it('formatError should ok', function () {
    const log = utils.formatError(new Error('just test'));
    expect(log).to.contain('host: ' + os.hostname());
  });

  it('resolveYYYYMMDDHH should ok', function () {
    const pad2 = utils.pad2;
    const finalStr = utils.resolveYYYYMMDDHH('#YYYY#.log');
    const now = new Date();
    expect(finalStr).to.be(now.getFullYear() + '.log');
    expect(utils.resolveYYYYMMDDHH('#MM#')).to.be(pad2(now.getMonth() + 1));
    expect(utils.resolveYYYYMMDDHH('#DD#')).to.be(pad2(now.getDate()));
    let str = '#YYYY##MM##DD#.log';
    let expt = '' + now.getFullYear() + pad2(now.getMonth() + 1) +
      utils.pad2(now.getDate());
    expect(utils.resolveYYYYMMDDHH(str)).to.be(expt + '.log');
    str = '#YYYY##MM##DD##HH#.log';
    expt = '' + now.getFullYear() + pad2(now.getMonth() + 1) +
      pad2(now.getDate()) + pad2(now.getHours());
    expect(utils.resolveYYYYMMDDHH(str)).to.be(expt + '.log');
  });

  describe('mock networkInterfaces', function () {
    const mock_stdout = {
      lo:
      [ { address: '127.0.0.1',
        netmask: '255.0.0.0',
        family: 'IPv4',
        mac: '00:00:00:00:00:00',
        internal: true,
        cidr: '127.0.0.1/8' },
      { address: '::1',
        netmask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
        family: 'IPv6',
        mac: '00:00:00:00:00:00',
        scopeid: 0,
        internal: true,
        cidr: '::1/128' } ],
      wlan0:
      [ { address: '30.40.53.100',
        netmask: '255.255.254.0',
        family: 'IPv4',
        mac: '7c:7a:91:a7:6b:c9',
        internal: false,
        cidr: '30.40.53.92/23' },
      { address: 'fe80::7a71:c6e7:3709:41e0',
        netmask: 'ffff:ffff:ffff:ffff::',
        family: 'IPv6',
        mac: '7c:7a:91:a7:6b:c9',
        scopeid: 3,
        internal: false,
        cidr: 'fe80::7a71:c6e7:3709:41e0/64' } ] };

    before(function () {
      mm.syncData(os, 'networkInterfaces', mock_stdout);
      mm.syncData(os, 'hostname', 'NewHost');
    });

    it('should ok', function (done) {
      let agentid = utils.getTagedAgentID('IP');
      expect(agentid).to.be('NewHost_53100');
      agentid = utils.getTagedAgentID();
      expect(agentid).to.be('NewHost');
      agentid = utils.getTagedAgentID('hoho');
      expect(agentid).to.be('NewHost');
      agentid = utils.getTagedAgentID(true);
      expect(agentid).to.be('NewHost');
      done();
    });

    after(function() {
      mm.restore();
    });
  });
});
