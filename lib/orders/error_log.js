'use strict';

var fs = require('fs');
var through = require('through2');
var split = require('split2');
var helper = require('../utils');

var MAX_LINES = 500; // 最多200行数据
var buffered = {};
exports.logs = []; // 日志路径

var map = new Map();

var patt = /Error: .* at /mg;

var getErrorLog = function (msg) {
  console.log(msg);
  var matched;
  var result = [];
  while ((matched = patt.exec(msg)) !== null) {
    console.log(matched);
  }
  return result;
};

var getRealPath = function (filepath) {
  return helper.resolveYYYYMMDD(filepath);
};

var readFile = function (key, filepath, callback) {
  fs.stat(key, filepath, function (err, stats) {
    if (err) {
      return callback(err);
    }

    if (!stats.isFile()) {
      err = new Error(filepath + ' is not a file');
      return callback(err);
    }

    var start = map.get(filepath) || 0;
    if (stats.size === start) {
      return callback(null);
    }

    var readable = fs.createReadStream(filepath, {start: start});
    readable.pipe(split()).pipe(through(function (line, _, next) {
      if (line.length) {
        buffered[key].push(line);
        if (buffered[key].length > MAX_LINES) {
          buffered[key].shift(); // 删掉前面的
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

var readLog = function (key, callback) {
  var currentPath = getRealPath(key);
  var current = map.get(key);

  if (currentPath !== current) {
    map.set(key, currentPath); // replace real path
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

var readLogs = function (callback) {
  var count = exports.logs.length;
  var returned = 0;
  var done = function (err) {
    returned++;
    if (returned === count) {
      callback(err); // 返回最后一个err
    }
  };
  for (var i = 0; i < count; i++) {
    var key = exports.logs[i];
    readLog(key, done);
  }
};

exports.init = function (config) {
  exports.logs = config.error_log;
  var logs = config.error_log;
  for (var i = 0; i < logs.length; i++) {
    var key = logs[i];
    buffered[key] = [];
    map.set(key, getRealPath(key));
  }
};

exports.run = function (callback) {
  if (exports.logs.length < 1) {
    callback(new Error("Not specific logdir in agentx config file"));
    return;
  }

  readLogs(function (err) {
    if (err) {
      callback(err);
      return;
    }

    var logs = exports.logs;
    var list = [];
    for (var i = 0; i < logs.length; i++) {
      var key = logs[i];
      var message = buffered[key].join('\n');
      buffered[key] = [];
      list.concat(getErrorLog(message));
    }

    callback(null, {
      type: 'error_log',
      metrics: list
    });
  });
};
