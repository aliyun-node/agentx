'use strict';

const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const execFile = require('child_process').execFile;
const exec = require('child_process').exec;

const util = require('util');

const accessAsync = util.promisify(fs.access);
const execFileAsync = util.promisify(execFile);
const execAsync = util.promisify(exec);

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

exports.execFileAsync = async function (command, args = []) {
  await accessAsync(command, fs.X_OK);
  return await execFileAsync(command, args);
};

exports.execAsync = execAsync;

let uid = 1000;
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
  const YYYY = date.getFullYear();
  const MM = exports.pad2(date.getMonth() + 1);
  const DD = exports.pad2(date.getDate());
  return '' + YYYY + MM + DD;
};

exports.formatError = function (err) {
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = exports.pad2(now.getMonth() + 1);
  const DD = exports.pad2(now.getDate());
  const hh = exports.pad2(now.getHours());
  const mm = exports.pad2(now.getMinutes());
  const ss = exports.pad2(now.getSeconds());
  const sss = exports.pad3(now.getMilliseconds());
  const time = util.format('%s-%s-%s %s:%s:%s.%s', YYYY, MM, DD, hh, mm, ss, sss);
  const format = ['%s %s: %s', 'pid: %s', 'host: %s', '%s'].join(os.EOL) + os.EOL;
  return util.format(format, time, err.name, err.stack, process.pid, os.hostname(), time);
};

exports.resolveYYYYMMDDHH = function (str) {
  const now = new Date();
  return str.replace('#YYYY#', now.getFullYear())
    .replace('#MM#', exports.pad2(now.getMonth() + 1))
    .replace('#DD#', exports.pad2(now.getDate()))
    .replace('#HH#', exports.pad2(now.getHours()));
};

/**
 * hostname 10.12.11.33
 * hostname#12d33
 */
exports.getTagedAgentID = function(agentidMode) {
  if (agentidMode !== 'IP') {
    return os.hostname();
  }

  const nets = os.networkInterfaces();
  const names = Object.keys(nets);
  for (let i = 0; i < names.length; i++) {
    const ifs = nets[names[i]];
    for (let j = 0; j < ifs.length; j++) {
      const net = ifs[j];
      if (net.family === 'IPv4' && net.address && net.address !== '127.0.0.1') {
        const ip_segmeng = net.address.split('.');
        if (ip_segmeng[2] && ip_segmeng[3]) {
          return os.hostname() + '_' + ip_segmeng[2] + ip_segmeng[3];
        }
      }
    }
  }
  // shall never called
  return os.hostname();
};
