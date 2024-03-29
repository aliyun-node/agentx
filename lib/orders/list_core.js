'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

exports.coredir = [];
const REPORT_INTERVAL = 60 * 1000;

// if user renamed core file, then only check those with the
// prefix
let coreFileNamePrefix = ['core'];

const statFile = function (filepath, callback) {
  fs.stat(filepath, function (err, stat) {
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

function check(prefixList, item) {
  return prefixList.some((prefix) => {
    return item.startsWith(prefix) && !item.endsWith('.gz');
  });
}

const statDir = function (dir, callback) {
  fs.readdir(dir, function (err, files) {
    if (err) {
      return callback(err);
    }
    let finished = 0;
    const count = files.length;
    const list = [];
    //the empty dir callback directly
    if (count === 0) {
      callback(null, list);
      return;
    }
    const done = function (err, stat) {
      finished++;
      if (stat) {
        list.push(stat);
      }
      if (finished === count) {
        callback(err, list);
      }
    };

    for (let i = 0; i < count; i++) {
      if (check(coreFileNamePrefix, files[i])) {
        const file = path.join(dir, files[i]);
        statFile(file, done);
      } else {
        done();
      }
    }
  });
};

const statCores = function (coredirs, callback) {
  const corelist = { ok: true, data: [] };
  const count = coredirs.length;
  let finished = 0;
  const done = function (err, stat) {
    finished++;
    if (!err) {
      corelist.data = corelist.data.concat(stat);
    }
    if (finished === count) {
      callback(err, corelist);
    }
  };

  for (let i = 0; i < count; i++) {
    const dir = coredirs[i];
    statDir(dir, done);
  }
};

const getNodePWD = function (pid, callback) {
  exec('cat /proc/' + pid + '/environ', function (err, env) {
    if (err) {
      // 忽略该进程
      return callback(null, null);
    }
    const envs = env.toString().trim().split('\u0000');
    for (let i = 0; i < envs.length; i++) {
      if (envs[i].indexOf('PWD') === 0) {
        return callback(null, envs[i].split('=')[1]);
      }
    }
    return callback(null, null);
  });
};

const getNodePids = function (callback) {
  exec('ps -e -o pid,args | grep -E "node " | grep -v grep', function (err, nodes) {
    if (err) {
      return callback(err);
    }
    const pids = [];
    const processes = nodes.toString().trim().split('\n');
    for (let i = 0; i < processes.length; i++) {
      if (processes[i] && processes[i].split(' ')[0]) {
        pids.push(processes[i].split(' ')[0]);
      }
    }
    callback(null, pids);
  });
};

const getNodePWDs = function (callback) {
  getNodePids(function (err, pids) {
    if (err) {
      return callback(err);
    }

    let finished = 0;
    const count = pids.length;
    if (count === 0) {
      callback(null, []);
    }
    const pwds = [];
    const done = function (err, pwd) {
      finished++;
      if (pwd && pwds.indexOf(pwd) === -1) {
        pwds.push(pwd);
      }
      if (finished === count) {
        callback(err, pwds);
      }
    };

    for (let i = 0; i < count; i++) {
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
    if (!fs.existsSync('/proc/sys/kernel/core_pattern')) { return; }
    const patt = fs.readFileSync('/proc/sys/kernel/core_pattern', 'utf8').trim().split(' ')[0];
    if (patt.indexOf('%') > 0) {
      // /tmp/core_%e.%p
      const coredir_ = path.parse(patt).dir;
      if (fs.existsSync(coredir_)) {
        try {
          fs.accessSync(coredir_, fs.R_OK);
          exports.coredir.push(coredir_);
          const prefix = path.parse(patt).name.split('%')[0];
          if (prefix !== coreFileNamePrefix[0]) {
            coreFileNamePrefix.push(prefix);
          }
        } catch (e) {
          console.log(coredir_ + ' is unaccessible: ' + e.message);
        }
      }
    }
    return;
  }
};

exports.run = function (callback) {
  const result = { type: 'coredump', metrics: null };
  if (os.platform() !== 'linux') {
    return callback(null, result);
  }

  getNodePWDs(function (err, pwds) {
    if (err) {
      return callback(err);
    }
    let dirs = exports.coredir.concat(pwds);
    if (!Array.isArray(dirs) || dirs.length === 0) {
      return callback(null, result);
    }
    dirs = Array.from(new Set(dirs));
    statCores(dirs, function (err, cores) {
      if (err) {
        callback(err);
      }
      result.metrics = cores;
      callback(null, result);
    });
  });
};

exports.reportInterval = REPORT_INTERVAL; // 1 min
