'use strict';

const fs = require('fs');
const path = require('path');

const through = require('through2');
const split = require('split2');
const helper = require('../utils');

const UPLOAD_COUNT = 1; // 每类只上传1行，只上传当次最慢的
const MAX_LINES = 20; // 每次最多处理20行数据

let buffered = [];
exports.logdir = ''; // 日志路径

const map = new Map();

const patt = /^\[([^\]]+)\] (.+) ([-><]{2}) (.+) "(.+) (.+) (.+) (\d+)" (\d+)$/;

const sortByRT = function (a, b) {
  if (a.rt < b.rt) {
    return 1;
  }

  if (a.rt > b.rt) {
    return -1;
  }

  return 0;
};

function getSlowHTTPLog(lines) {
  const receives = [];
  const sends = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matched = line.match(patt);
    if (matched) {
      const type = matched[3] === '->' ? 'receive': 'send';
      const item = {
        timestamp: matched[1],
        from: matched[2],
        type: type,
        to: matched[4],
        method: matched[5],
        url: matched[6],
        protocol: matched[7],
        code: parseInt(matched[8]),
        rt: parseInt(matched[9])
      };
      if (type === 'receive') {
        receives.push(item);
      } else {
        sends.push(item);
      }
    }
  }

  // sort and limit
  receives.sort(sortByRT);
  sends.sort(sortByRT);

  return receives.slice(0, UPLOAD_COUNT).concat(sends.slice(0, UPLOAD_COUNT));
}

const getCurrentLogPath = function () {
  const now = new Date();
  const date = helper.getYYYYMMDD(now);
  return path.join(exports.logdir, 'access-' + date + '.log');
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

    const readable = fs.createReadStream(filepath, {start: start});
    readable.pipe(split()).pipe(through(function (line, _, next) {
      if (line.length) {
        buffered.push(line.toString());
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

    // no data
    if (buffered.length === 0) {
      return callback(null, null);
    }

    const metrics = getSlowHTTPLog(buffered);
    // clean
    buffered = [];

    callback(null, {
      type: 'slow_http',
      metrics: metrics
    });
  });
};
