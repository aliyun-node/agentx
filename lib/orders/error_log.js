'use strict';

const fs = require('fs');

const helper = require('../utils');
const Parser = require('../error_parser');

const MAX_ERROR_COUNT = 20; // 一次最多抓获20个Error
exports.logs = []; // 日志路径

const keyMap = new Map(); // 记录每个key实际对应的路径值
const map = new Map(); // 记录每个文件访问的位置
const parsers = new Map(); // 每个key都有一个parser

function getRealPath (filepath) {
  return helper.resolveYYYYMMDDHH(filepath);
}

var readFile = function (key, filepath, callback) {
  fs.stat(filepath, function (err, stats) {
    if (err) {
      if (err.code === 'ENOENT') {
        return callback(null);
      }
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

    // 如果文件大小小于上次读取的地方，说明是一个新文件
    if (stats.size < start) {
      start = 0;
    }

    var readable = fs.createReadStream(filepath, {
      start: start,
      encoding: 'utf8'
    });

    readable.on('data', function (data) {
      start += Buffer.byteLength(data);
    });

    readable.on('end', function () {
      map.set(filepath, start);
    });

    var parser = parsers.get(key);
    parser.parseStream(readable, function (err) {
      if (err) {
        return callback(err);
      }
      callback(null);
    });
  });
};

var readLog = function (key, callback) {
  var currentPath = getRealPath(key);
  var current = keyMap.get(key);

  if (currentPath !== current) {
    keyMap.set(key, currentPath); // replace real path
    readFile(key, current, function (err) {
      if (err) {
        return callback(err);
      }
      readFile(key, currentPath, callback);
    });
  } else {
    readFile(key, currentPath, callback);
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
  if (config.error_log) {
    exports.logs = config.error_log;
    var logs = config.error_log;

    for (var i = 0; i < logs.length; i++) {
      var key = logs[i];
      parsers.set(key, new Parser(MAX_ERROR_COUNT));
      var realPath = getRealPath(key);
      if (fs.existsSync(realPath)) {
        map.set(realPath, fs.statSync(realPath).size);
      }
      keyMap.set(key, realPath);
    }
  }
};

exports.run = function (callback) {
  if (exports.logs.length < 1) {
    // no error log specificed, ignore
    callback(null, null);
    return;
  }

  readLogs(function (err) {
    if (err) {
      return callback(err);
    }

    var logs = exports.logs;
    var list = [];
    for (var i = 0; i < logs.length; i++) {
      var key = logs[i];
      var parser = parsers.get(key);
      list = list.concat(parser.list);
      parser.list = [];
    }

    callback(null, {
      type: 'error_log',
      metrics: list
    });
  });
};
