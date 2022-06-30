'use strict';

const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const execFile = require('child_process').execFile;
const util = require('util');

exports.sha1 = function (str, key) {
  return crypto.createHmac('sha1', key).update(str).digest('hex');
};

exports.execCommand = function (file, args, opts, callback) {
  execFile(file, args, opts, callback);
};

exports.execFile = function (command, args, callback) {
  if (typeof args === 'function') {
    callback = args;
    args = [];
  }

  fs.access(command, fs.X_OK, function (err) {
    if (err) {
      return callback(err);
    }
    execFile(command, args, callback);
  });
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

exports.resolveYYYYMMDDHH = function (str) {
  var now = new Date();
  return str.replace('#YYYY#', now.getFullYear())
    .replace('#MM#', exports.pad2(now.getMonth() + 1))
    .replace('#DD#', exports.pad2(now.getDate()))
    .replace('#HH#', exports.pad2(now.getHours()));
};

/*
hostname 10.12.11.33
hostname#12d33
*/
exports.getTagedAgentID = function(agentidMode) {
  if (agentidMode !== 'IP') {
    return os.hostname();
  }

  var nets = os.networkInterfaces();
  var names = Object.keys(nets);
  for (var i = 0; i < names.length; i++) {
    var ifs = nets[names[i]];
    for (var j = 0; j < ifs.length; j++) {
      var net = ifs[j];
      if (net.family === 'IPv4' && net.address && net.address !== '127.0.0.1') {
        var ip_segmeng = net.address.split('.');
        if (ip_segmeng[2] && ip_segmeng[3]) {
          return os.hostname() + '_' + ip_segmeng[2] + ip_segmeng[3];
        }
      }
    }
  }
  // shall never called
  return os.hostname();
};
