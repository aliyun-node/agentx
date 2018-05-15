'use strict';

var fs = require('fs');
var path = require('path');
var through = require('through2');
var split = require('split2');
var helper = require('../utils');

var MAX_LINES = 1000; // 最多 500 行数据
var buffered = [];
exports.logdir = ''; // 日志路径

var map = new Map();

function getTracingLog(msg) {
  var result = { ok: true, data: [] };
  var logs = msg.split('\n');
  result.data = logs.map(log => {
    var valid = true;
    try {
      log = JSON.parse(log);
      valid = log.traceId && log.spanId && log.startTime && log.rootTime && log.duration;
    } catch (e) {
      valid = false;
    }
    return valid && log;
  }).filter(log => log);
  return result;
}

var getCurrentLogPath = function () {
  var now = new Date();
  var date = helper.getYYYYMMDD(now);
  return path.join(exports.logdir, 'npp-tracing-' + date + '.log');
};

var readFile = function (filepath, callback) {
  fs.stat(filepath, function (err, stats) {
    if (err) {
      if (err.code === 'ENOENT') {
        return callback(null);
      }
      return callback(err);
    }

    if (!stats.isFile()) {
      return callback(new Error(filepath + ' is not a file'));
    }

    var start = map.get(filepath) || 0;
    if (stats.size === start) {
      return callback(null);
    }

    var readable = fs.createReadStream(filepath, { start: start });
    readable.pipe(split()).pipe(through(function (line, _, next) {
      if (line.length) {
        buffered.push(line);
        if (buffered.length > MAX_LINES) {
          buffered.shift(); // 删掉前面的
        }
      }
      next();
    }));

    readable.on('data', function (data) {
      start += data.length;
    });

    readable.on('end', function () {
      map.set(filepath, start);
      callback(null);
    });
  });
};

var readLog = function (callback) {
  var currentPath = getCurrentLogPath();
  var current = map.get('currentFile');
  if (currentPath !== current) {
    map.set('currentFile', currentPath);
    readFile(current, function (err) {
      if (err) {
        return callback(err);
      }
      readFile(currentPath, callback);
    });
  } else {
    readFile(currentPath, callback);
  }
};

exports.init = function (config) {
  exports.logdir = config.logdir;
  var currentPath = getCurrentLogPath();
  map.set('currentFile', currentPath);
  if (fs.existsSync(currentPath)) {
    map.set(currentPath, fs.statSync(currentPath).size);
  }
  buffered = [];
};

exports.run = function (callback) {
  if (!exports.logdir) {
    return callback(new Error('Not specific logdir in agentx config file'));
  }

  readLog(function (err) {
    if (err) {
      return callback(err);
    }
    var message = buffered.join('\n');
    // clean
    buffered = [];
    callback(null, {
      type: 'tracing_log',
      metrics: getTracingLog(message)
    });
  });
};