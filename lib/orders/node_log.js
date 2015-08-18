'use strict';

var co = require('co');
var thunkify = require('thunkify');
var fs = require('fs');
var path = require('path');
var through = require('through2');
var split = require('split2');

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
    var level = matched[1];
    var type = matched[2];
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
  var date = now.getFullYear().toString() +
      (now.getMonth() < 9 ? '0' + (now.getMonth() + 1) : (now.getMonth() + 1)) +
      (now.getDate() < 10 ? '0' + now.getDate() : now.getDate());
  return path.join(exports.logdir, 'node-' + date + '.log');
};

var getFileSize = function (path) {
  return fs.statSync(path).size;
};

var readFile = function (path, callback) {
  fs.stat(path, function (err, stats) {
    if (err) {
      console.log(path + ' does not exist.');
      callback(null, '');
      return;
    }
    if (!stats.isFile()) {
      console.log(path + ' is not a file.');
      callback(null, '');
      return;
    }

    var start = map.get(path) || 0;
    if (stats.size === start) {
      callback(null, '');
      return;
    }

    var readable = fs.createReadStream(path, {start: start});
    readable.pipe(split()).pipe(through(function (line, _, next) {
      if (line.length) {
        buffered.push(line + '\n');
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
      var msg = buffered.join();
      buffered = [];

      callback(null, msg);
    });
  });
};

var readFile = thunkify(readFile);
var readLog = function (map, callback) {
  var currentPath = getCurrentLogPath();
  co(function * () {
    var last = '';
    var current = '';

    if (currentPath !== map.get('currentFile')) {
      last = yield readFile(map.get('lastFile'));
      map.delete(map.get('lastFile'));
      map.set('lastFile', currentPath);
    }
    current = yield readFile(map.get('currentFile'));
    map.set('currentFile', currentPath);

    callback(null, {
      type: 'node_log',
      metrics: getNodeLog(last + current)
    });
  });
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
