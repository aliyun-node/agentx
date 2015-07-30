'use strict';

var path = require('path');
var through = require('through2');
var sf = require('slice-file');
var fs = require('fs');

var MAX_LINES = 100; // 最多100行数据
var buffered = [];
exports.logdir = ''; // 日志路径
var xs;
var createFileIfNotExists = function(path) {
  // TODO: blocking i/o
  var fd = fs.openSync(path, 'a');
  fs.close(fd);
};

var date = function(now) {
  if (!now) {
    now = new Date();
  }

  var date = now.getFullYear() +
      (now.getMonth() < 9 ? '0' + (now.getMonth() + 1) : (now.getMonth()+1)) +
      (now.getDate() < 10 ? '0' + now.getDate() : now.getDate());
  var time = now.toLocaleTimeString();
  var ms = now.getTime();

  return {
    date: date,
    time: time,
    ms: ms
  };
};

// log文件每天生成一个新的
// 生成现在log文件,明天log文件,和切换需要时间(ms)
function getLogFileInfo() {
  var now = date();
  var ms = now.ms;
  var nextDate = new Date(ms + 24 * 3600 * 1000);
  var next = date(nextDate);
  var ndate = next.date;
  var str = ndate.substr(0, 4) + '-' + ndate.substr(4, 2) + '-' + ndate.substring(6) + ' 00:00:00';
  var zero = new Date(str);

  var diff = zero.getTime() - now.ms;

  return {
    current: path.join(exports.logdir, 'node-' + now.date + '.log'),
    timeToRefresh: diff
  };
}

function startTailf(path) {
  var xs = sf(path);
  xs.follow(-1).pipe(through(function(line, _, next){
    buffered.push(line);
    if (buffered.length > MAX_LINES) {
      buffered.shift(); // 删掉前面的
    }
    next();
  }));
  return xs;
}

var patt = /\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.\d{6}\] \[(.+)\] \[(.+)\] \[(\d+)\] (.*)/g;
var reg = /([^\s]*): (\d+)/g;

function getNodeLog(msg) {
  var matched;
  var result = {ok: true, data: []};
  while ((matched = patt.exec(msg)) !== null)  {
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
  var info = getLogFileInfo();
  createFileIfNotExists(info.current);
  xs = startTailf(info.current);
  setTimeout(function() {
    xs.close();
    init();
  }, info.timeToRefresh);
};

exports.init = function (logdir) {
  exports.logdir = logdir;
  init();
};

exports.run = function (callback) {
  var msg = Buffer.concat(buffered).toString();
  // empty buffered array
  buffered = [];

  callback(null, {
    type: 'node_log',
    metrics: getNodeLog(msg)
  });
};
