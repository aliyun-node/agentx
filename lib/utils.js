'use strict';

var crypto = require('crypto');
var execFile = require('child_process').execFile;

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
