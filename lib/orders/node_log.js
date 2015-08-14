'use strict';

var fs = require('fs');
var path = require('path');
var through = require('through2');
var split = require('split2');

var MAX_LINES = 100; // 最多100行数据
var buffered = [];
exports.logdir = ''; // 日志路径

var map = {};

process.on('uncaughtException', function (err) {
  console.log(new Date());
  console.log(err);
  process.exit(-1);
});

var getLogPath = function () {
  var now = new Date();
  var date = now.getFullYear().toString() +
      (now.getMonth() < 9 ? '0' + (now.getMonth() + 1) : (now.getMonth() + 1)) +
      (now.getDate() < 10 ? '0' + now.getDate() : now.getDate());
  return path.join(exports.logdir, 'node-' + date + '.log');
};

var getFileSize = function (path) {
  return fs.statSync(path).size;
};

var readFile = function (path) {
  fs.stat(path, function (err, stats) {
    if (err) {
      console.log('path is not exist');
      return;
    }
    if (!stats.isFile()) {
      console.log('not a file');
      return;
    }
    var index = path;

    var start = map[index] || 0;
    if (stats.size === start) {
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
      map[index] = start;
    });
  });
};

var readLog = function (map) {
  var current = getLogPath();
  if (current !== map['current']) {
    readFile(map['last']);
    map['last'] = current;
  }
  readFile(current);
  map['current'] = current;
};

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

var init = function () {
  var path = getLogPath();
  map['last'] = '';
  map['current'] = path;
  map[path] = getFileSize(path);
  buffered = [];
};

exports.init = function (logdir) {
  exports.logdir = logdir;
  init();
};

exports.run = function (callback) {
  readLog(map);
  var msg = Buffer.concat(buffered).toString();
  buffered = [];

  callback(null, {
    type: 'node_log',
    metrics: getNodeLog(msg)
  });
};
