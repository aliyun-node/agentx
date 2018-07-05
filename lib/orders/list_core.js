'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

exports.coredir = [];
const REPORT_INTERVAL = 60 * 1000;

// if user renamed core file, then only check those with the
// prefix
var coreFileNamePrefix = ['core'];

var statFile = function (filepath, callback) {
  fs.stat(filepath, function(err, stat) {
    if (err) {
      return callback(err);
    }

    // bypass directory
    if (!stat.isFile()) {
      return callback(null, null);
    }

    // bypass core created before agentx startup
    if (stat.ctimeMs < Date.now() - REPORT_INTERVAL) {
      return callback(null, null);
    }

    return callback(null, {
      path: filepath,
      size: stat.size,
      ctime: stat.ctime
    });
  });
};

var statDir = function(dir, callback) {
  fs.readdir(dir, function(err, files) {
    if (err) {
      return callback(err);
    }
    var finished = 0;
    var count = files.length;
    var list = [];
    var done = function(err, stat) {
      finished++;
      if (stat) {
        list.push(stat);
      }
      if (finished === count) {
        callback(err, list);
      }
    };

    for (var i = 0; i < count; i++) {
      if (files[i].indexOf(coreFileNamePrefix[0]) === 0 ||
        files[i].indexOf(coreFileNamePrefix[1]) === 0) {
        var file = path.join(dir, files[i]);
        statFile(file, done);
      } else {
        done();
      }
    }
  });
};

var statCores = function(coredirs, callback) {
  var corelist = {ok: true, data: []};
  var count = coredirs.length;
  var finished = 0;
  var done = function(err, stat) {
    finished++;
    corelist.data = corelist.data.concat(stat);
    if (finished === count) {
      callback(err, corelist);
    }
  };

  for (var i = 0; i < count; i++) {
    var dir = coredirs[i];
    statDir(dir, done);
  }
};

var getNodePWD = function(pid, callback) {
  exec('cat /proc/' + pid + '/environ', function(err, env) {
    if (err) {
      // 忽略该进程
      return callback(null, null);
    }
    var envs = env.toString().trim().split('\u0000');
    for (var i = 0; i < envs.length; i++) {
      if (envs[i].indexOf('PWD') === 0) {
        return callback(null, envs[i].split('=')[1]);
      }
    }
    return callback(null, null);
  });
};

var getNodePids = function(callback) {
  exec('ps -e -o pid,args | grep -E "node " | grep -v grep', function(err, nodes) {
    if (err) {
      return callback(err);
    }

    var pids = [];
    var processes = nodes.toString().trim().split('\n');
    for(var i = 0; i < processes.length; i++) {
      if (processes[i] && processes[i].split(' ')[0]) {
        pids.push(processes[i].split(' ')[0]);
      }
    }
    callback(null, pids);
  });
};

var getNodePWDs = function(callback) {
  getNodePids(function(err, pids) {
    if (err) {
      return callback(err);
    }

    var finished = 0;
    var count = pids.length;
    var pwds = [];
    var done = function(err, pwd) {
      finished++;
      if (pwd && pwds.indexOf(pwd) === -1) {
        pwds.push(pwd);
      }
      if (finished === count) {
        callback(err, pwds);
      }
    };

    for (var i = 0; i < count; i++) {
      getNodePWD(pids[i], done);
    }
  });
};

/*******************************************************************************
* 在以下3种路径下查找core文件
* 1. 用户指定路径 config.json里面 coredir:[dir1, dir2, ...]
* 2. 用户在 /proc/sys/kernel/core_pattern 指定core生成格式
*   /proc/sys/kernel/core_pattern 可以设置格式化的 core 文件保存位置或文件名
*   echo “/opt/corefile/core-%e-%p-%t” > /proc/sys/kernel/core_pattern
*   将会控制所产生的 core 文件会存放到 /corefile
*   以下是参数列表 :
*   %p - insert pid into filename
*   %u - insert current uid into filename
*   %g - insert current gid into filename
*   %s - insert signal that caused the coredump into the filename
*   %t - insert UNIX time that the coredump occurred into filename
*   %h - insert hostname where the coredump happened into filename
*   %e - insert coredumping executable name into filename
*   注: 只处理上面这种形式，对于第三方处理的情况不考虑
* 3. 那么对于linux系统，在Node进程的pwd目录，对于Mac在/cores下查找
*
*******************************************************************************/

exports.init = function (config) {
  exports.coredir = [];
  coreFileNamePrefix = ['core'];

  if (config && config.coredir) {
    if (Array.isArray(config.coredir)) {
      exports.coredir = config.coredir;
    } else if (typeof config.coredir === 'string') {
      exports.coredir = [config.coredir];
    }
  }

  // for linux, check
  // core dir specified by /proc/sys/kernal/core_pattern e.g. '/tmp/core_%e.%p'
  if (os.platform() === 'linux') {
    var patt = fs.readFileSync('/proc/sys/kernel/core_pattern', 'utf8').trim().split(' ')[0];
    if (patt.indexOf('%') > 0) {
      // /tmp/core_%e.%p
      exports.coredir.push((path.parse(patt).dir));
      var prefix = path.parse(patt).name.split('%')[0];
      if (prefix !== coreFileNamePrefix[0]) {
        coreFileNamePrefix.push(prefix);
      }
    }
    return;
  }
};

exports.run = function (callback) {
  var result = {type: 'coredump', metrics: null};
  if (os.platform() !== 'linux') {
    return callback(null, result);
  }

  getNodePWDs(function(err, pwds) {
    if (err) {
      return callback(err);
    }

    var dirs = exports.coredir.concat(pwds);
    if (dirs.length === 0) {
      return callback(null, result);
    }

    statCores(dirs, function(err, cores) {
      if (err) {
        callback(err);
      }
      result.metrics = cores;
      callback(null, result);
    });
  });
};

exports.reportInterval = REPORT_INTERVAL; // 1 min
