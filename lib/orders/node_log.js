'use strict';

const fs = require('fs');
const path = require('path');

const through = require('through2');
const split = require('split2');

const helper = require('../utils');

const MAX_LINES = 250; // 最多200行数据
let buffered = [];
exports.logdir = ''; // 日志路径

const map = new Map();

const patt = /\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.\d{6}\] \[(.+)\] \[(.+)\] \[(\d+)\] (.*)/g;
const reg = /([^\s]*): (\d+(\.\d{0,2})?)/g;

function getNodeLog(msg) {
  let matched;
  const result = {ok: true, data: []};
  while ((matched = patt.exec(msg)) !== null) {
    const pid = matched[3];
    const detail = matched[4];

    let pair;
    while ((pair = reg.exec(detail)) !== null)  {
      result.data.push({
        pid: pid,
        item: pair[1],
        value: parseFloat(pair[2])
      });
    }
  }
  return result;
}

function getCurrentLogPath() {
  const now = new Date();
  const date = helper.getYYYYMMDD(now);
  return path.join(exports.logdir, 'node-' + date + '.log');
}

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

    const readable = fs.createReadStream(filepath, {start: start});
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

    const message = buffered.join('\n');
    // clean
    buffered = [];
    callback(null, {
      type: 'node_log',
      metrics: getNodeLog(message)
    });
  });
};
