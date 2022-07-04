'use strict';

const fs = require('fs');
const path = require('path');
const through = require('through2');
const split = require('split2');
const helper = require('../utils');

const MAX_LINES = 250; // 最多 250 行数据
let buffered = [];
exports.logdir = ''; // 日志路径

const map = new Map();

const isValid = function (log) {
  return log.traceId && log.spanId && log.startTime && log.rootTime && log.duration;
};

function getTracingLog(msg) {
  const result = { ok: true, data: [] };
  result.data = msg.reduce((logs, log) => {
    log = log.toString();
    try {
      log = JSON.parse(log);
      if (Array.isArray(log)) {
        logs = logs.concat(log.filter(l => isValid(l)));
      } else {
        if (isValid(log)) {
          logs.push(log);
        }
      }
    } catch (e) { console.error(`json parse log '${log}' failed`); }
    return logs;
  }, []);
  return result;
}

const getCurrentLogPath = function () {
  const now = new Date();
  const date = helper.getYYYYMMDD(now);
  return path.join(exports.logdir, 'tracing-' + date + '.log');
};

const readFile = function (filepath, callback) {
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

    let start = map.get(filepath) || 0;
    if (stats.size === start) {
      return callback(null);
    }

    const readable = fs.createReadStream(filepath, { start: start });
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

const readLog = function (callback) {
  const currentPath = getCurrentLogPath();
  const current = map.get('currentFile');
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
  const currentPath = getCurrentLogPath();
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
    const message = buffered;
    buffered = [];
    // clean
    callback(null, {
      type: 'tracing_log',
      metrics: getTracingLog(message)
    });
  });
};