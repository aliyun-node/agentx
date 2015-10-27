'use strict';

var os = require('os');
var path = require('path');
var crypto = require('crypto');
var execFile = require('child_process').execFile;
var util = require('util');

exports.sha1 = function (str, key) {
  return crypto.createHmac('sha1', key).update(str).digest('hex');
};

exports.execCommand = function (file, args, opts, callback) {
  execFile(file, args, opts, callback);
};

var uid = 1000;
exports.uid = function () {
  return uid++;
};

exports.random = function (min, max) {
  return Math.floor(min + Math.random() * (max - min));
};

exports.pad2 = function (num) {
  if (num < 10) {
    return '0' + num;
  }
  return '' + num;
};

exports.pad3 = function (num) {
  if (num < 10) {
    return '00' + num;
  } else if (num < 100) {
    return '0' + num;
  }
  return '' + num;
};

exports.getYYYYMMDD = function (date) {
  var YYYY = date.getFullYear();
  var MM = exports.pad2(date.getMonth() + 1);
  var DD = exports.pad2(date.getDate());
  return '' + YYYY + MM + DD;
};

exports.formatError = function (err) {
  var now = new Date();
  var YYYY = now.getFullYear();
  var MM = exports.pad2(now.getMonth() + 1);
  var DD = exports.pad2(now.getDate());
  var hh = exports.pad2(now.getHours());
  var mm = exports.pad2(now.getMinutes());
  var ss = exports.pad2(now.getSeconds());
  var sss = exports.pad3(now.getMilliseconds());
  var time = util.format('%s-%s-%s %s:%s:%s.%s', YYYY, MM, DD, hh, mm, ss, sss);
  var format = ['%s %s: %s', 'pid: %s', 'host: %s', '%s'].join(os.EOL) + os.EOL;
  return util.format(format, time, err.name, err.stack, process.pid, os.hostname(), time);
};

exports.resolveYYYYMMDD = function (str) {
  var now = new Date();
  return str.replace('#YYYY#', now.getFullYear())
    .replace('#MM#', exports.pad2(now.getMonth() + 1))
    .replace('#DD#', exports.pad2(now.getDate()));
};

exports.getAgentxPaths = function () {
  var argvs = process.argv;
  var node_path   = argvs[0];
  var agentx_path = argvs[1].replace('lib/node_modules/agentx/client.js', 'bin/agentx');
  var cfg_path = path.resolve(argvs[2]);
  var script_path = argvs[1].replace('agentx/client.js', 'agentx/reboot/start_agentx_at_reboot');
  var start_agentx_path = script_path.replace('start_agentx_at_reboot', 'startagentx');

  return {
    node: node_path,
    agentx: agentx_path,
    cfg: cfg_path,
    start_agentx: start_agentx_path,
    script: script_path
  };
};

