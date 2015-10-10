'use strict';

var path = require('path');
var fs = require('fs');
var execFile = require('child_process').execFile;

var command = '';

exports.init = function (config) {
  command = path.join(config.cmddir, 'get_node_version');
};

var getVersion = function (callback) {
  fs.access(command, fs.X_OK, function (err) {
    if (err) {
      return callback(err);
    }
    execFile(command, function (err, stdout) {
      callback(err, stdout);
    });
  });
};

exports.run = function (callback) {
  getVersion(function (err, stdout) {
    if (err) {
      return callback(err);
    }

    callback(null, {
      type: 'version',
      metrics: {
        node: stdout.trim()
      }
    });
  });
};

exports.reportInterval = 24 * 60 * 60 * 1000; // 1day
