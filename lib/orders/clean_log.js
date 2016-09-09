'use strict';

var fs = require('fs');
var path = require('path');
var helper = require('../utils');

exports.logdir = ''; // 日志路径

// 日志保留天数
var KEEP_DAYS = 7;

var removeFiles = function (logdir, files, callback) {
  var count = files.length;
  if (count === 0) {
    return callback(null);
  }

  var done = function (err) {
    if (err) {
      return callback(err);
    }

    count--;
    if (count <= 0) {
      callback(null);
    }
  };

  for (var i = 0; i < files.length; i++) {
    var filename = files[i];
    var filepath = path.join(logdir, filename);
    console.log('clean old log file: %s', filepath);
    fs.unlink(filepath, done);
  }
};

var patt = /^(node|access)-(\d{8})\.log$/;

var cleanOldLogs = function (callback) {
  fs.readdir(exports.logdir, function (err, files) {
    if (err) {
      return callback(err);
    }

    var now = new Date();
    var today = parseInt(helper.getYYYYMMDD(now), 10);
    var logs = files.filter(function (filename) {
      var matched = filename.match(patt);
      if (matched) {
        var date = parseInt(matched[2]);
        if (date < today - KEEP_DAYS) {
          // 删除KEEP_DAYS天前的node/access日志
          return true;
        }
      }

      return false;
    });

    removeFiles(exports.logdir, logs, callback);
  });
};

exports.init = function (config) {
  exports.logdir = config.logdir;
};

exports.run = function (callback) {
  if (!exports.logdir) {
    return callback(new Error('Not specific logdir in agentx config file'));
  }

  cleanOldLogs(function (err) {
    if (err) {
      return callback(err);
    }

    // nothing to report
    callback(null);
  });
};

exports.reportInterval = 24 * 60 * 60 * 1000; // 1 day
