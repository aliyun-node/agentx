'use strict';

var path = require('path');
var through = require('through2')
var sf = require('slice-file');
var fs = require('fs');

var buffered = [];
exports.logdir = ''; // 日志路径
var xs;


var createFileIfNotExists = function(path) {
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
    ms:   ms
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
    next: path.join(exports.logdir, 'node-' + next.date + '.log'),
    ms_to_refresh: diff
  };
}

function startTailf(path) {
  var xs = sf(path);
  var t = xs.follow(-1).pipe(through(function(line, _, next){
    buffered.push(line);
    next();
  }));
  return xs;
}

var patt = /\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.\d{6}\] \[(.+)\] \[(.+)\] \[(\d+)\] (.*)/g;
var reg = /([^\s]*): (\d+)/g;

function getNodeLog() {
  var msg = Buffer.concat(buffered).toString();
  // empty buffered array
  buffered = [];

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
  createFileIfNotExists(info.next);
  setTimeout(function() {
    xs.close();
    init();
  }, info.ms_to_refresh);
};

exports.init = function (logdir) {
  exports.logdir = logdir;
  init();
};

exports.run = function (callback) {
  callback(null, {
    type: 'node_log',
    metrics: getNodeLog()
  });
};
