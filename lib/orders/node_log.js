'use strict';

var fs = require('fs');
var path = require('path');
var through = require('through2');
var split = require('split2');
var helper = require('../utils');

var MAX_LINES = 100; // 最多100行数据
var buffered = [];
exports.logdir = ''; // 日志路径

var map = new Map();

var patt = /\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.\d{6}\] \[(.+)\] \[(.+)\] \[(\d+)\] (.*)/g;
var reg = /([^\s]*): (\d+)/g;

function getNodeLog(msg) {
  var matched;
  var result = {ok: true, data: []};
  while ((matched = patt.exec(msg)) !== null) {
    var pid = matched[3];
    var detail = matched[4];

    var pair;
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

var getCurrentLogPath = function () {
  var now = new Date();
  var date = helper.getYYYYMMDD(now);
  return path.join(exports.logdir, 'node-' + date + '.log');
};

var getFileSize = function (path) {
  return fs.statSync(path).size;
};

var _readFileCallback = function (last, current, callback) {
  if (last) {
    readFile(null, current, callback);
  } else {
    var msg = buffered.join('\n');
    buffered = [];

    callback(null, {
      type: 'node_log',
      metrics: getNodeLog(msg)
    });
  }
};

var readFile = function (last, current, callback) {
  var path = current;

  if (last) {
    path = last;
  }

  fs.stat(path, function (err, stats) {
    if (err) {
      console.log(path + ' does not exist.');
      _readFileCallback(last, current, callback);
      return;
    }
    if (!stats.isFile()) {
      console.log(path + ' is not a file.');
      _readFileCallback(last, current, callback);
      return;
    }

    var start = map.get(path) || 0;
    if (stats.size === start) {
      _readFileCallback(last, current, callback);
      return;
    }

    var readable = fs.createReadStream(path, {start: start});
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
      map.set(path, start);
      _readFileCallback(last, current, callback);
    });
  });
};

var readLog = function (map, callback) {
  var currentPath = getCurrentLogPath();
  var last = map.get('lastFile');
  var current = map.get('currentFile');

  if (currentPath !== current) {
    map.set('lastFile', currentPath);
    map.set('currentFile', currentPath);
    readFile(last, current, callback);
  } else {
    readFile(null, current, callback);
  }
};

var init = function () {
  var currentPath = getCurrentLogPath();
  map.set('lastFile', '');
  map.set('currentFile', currentPath);
  map.set(currentPath, getFileSize(currentPath));
  buffered = [];
};

exports.init = function (logdir) {
  exports.logdir = logdir;
  init();
};

exports.run = function (callback) {
  readLog(map, callback);
};
