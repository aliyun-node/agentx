'use strict';

const fs = require('fs');

const helper = require('../utils');
const Parser = require('../error_parser');

const MAX_ERROR_COUNT = 10; // 一次最多抓获10个Error
exports.logs = []; // 日志路径

const keyMap = new Map(); // 记录每个key实际对应的路径值
const map = new Map(); // 记录每个文件访问的位置
const parsers = new Map(); // 每个key都有一个parser

function getRealPath (filepath) {
  return helper.resolveYYYYMMDDHH(filepath);
}

const readFile = function (key, filepath, callback) {
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

    let start = map.get(filepath) || 0;
    if (stats.size === start) {
      return callback(null);
    }

    // 如果文件大小小于上次读取的地方，说明是一个新文件
    if (stats.size < start) {
      start = 0;
    }

    const readable = fs.createReadStream(filepath, {
      start: start,
      encoding: 'utf8'
    });

    readable.on('data', function (data) {
      start += Buffer.byteLength(data);
    });

    readable.on('end', function () {
      map.set(filepath, start);
    });

    const parser = parsers.get(key);
    parser.parseStream(readable, function (err) {
      if (err) {
        return callback(err);
      }
      callback(null);
    });
  });
};

const readLog = function (key, callback) {
  const currentPath = getRealPath(key);
  const current = keyMap.get(key);

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

const readLogs = function (callback) {
  const count = exports.logs.length;
  let returned = 0;
  const done = function (err) {
    returned++;
    if (returned === count) {
      callback(err); // 返回最后一个err
    }
  };
  for (let i = 0; i < count; i++) {
    const key = exports.logs[i];
    readLog(key, done);
  }
};

exports.init = function (config) {
  if (config.error_log) {
    exports.logs = config.error_log;
    const logs = config.error_log;

    for (let i = 0; i < logs.length; i++) {
      const key = logs[i];
      parsers.set(key, new Parser(MAX_ERROR_COUNT));
      const realPath = getRealPath(key);
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

    const logs = exports.logs;
    let list = [];
    for (let i = 0; i < logs.length; i++) {
      const key = logs[i];
      const parser = parsers.get(key);
      list = list.concat(parser.list);
      parser.list = [];
    }

    callback(null, {
      type: 'error_log',
      metrics: list
    });
  });
};
