'use strict';

const fs = require('fs');
const path = require('path');

const helper = require('../utils');

exports.logdir = ''; // 日志路径

// 日志保留天数
const KEEP_DAYS = 7;
const SECONDS_PER_DAY = 86400;

function getDate(ymd) {
  ymd = ymd.toString();
  const d = ymd.substr(0, 4) + '-' + ymd.substr(4, 2) + '-' + ymd.substr(6, 2);
  return new Date(d);
}

function isOldFile(today, date, days) {
  const todaySeconds = getDate(today) / 1000;
  const dateSeconds = getDate(date) / 1000;
  const diff = days * SECONDS_PER_DAY;
  return todaySeconds - dateSeconds > diff;
}

const isAlive = function (pid) {
  try {
    return process.kill(pid, 0);
  } catch (ex) {
    return false;
  }
};

const removeFiles = function (logdir, files, callback) {
  let count = files.length;
  if (count === 0) {
    return callback(null);
  }

  const done = function (err) {
    if (err) {
      return callback(err);
    }

    count--;
    if (count <= 0) {
      callback(null);
    }
  };

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filepath = path.join(logdir, filename);
    console.log('clean old log or domain socket file file: %s', filepath);
    fs.unlink(filepath, done);
  }
};

const patt = /^(node|access|tracing)-(\d{8})\.log$/;
const alinodeSocketPatt = /^(alinode-uds-path)-(\d+)$/;

const cleanOldLogs = function (callback) {
  fs.readdir(exports.logdir, function (err, files) {
    if (err) {
      return callback(err);
    }

    const now = new Date();
    const today = parseInt(helper.getYYYYMMDD(now), 10);

    const logs = files.filter(function (filename) {
      const matched = filename.match(patt);
      if (matched) {
        const date = parseInt(matched[2]);
        if (isOldFile(today, date, KEEP_DAYS)) {
          // 删除KEEP_DAYS天前的node/access日志
          return true;
        }
      }

      return false;
    });

    const sockets = files.filter(filename => {
      const matched = filename.match(alinodeSocketPatt);
      if (matched) {
        const pid = parseInt(matched[2]);
        if (isNaN(pid) || !isAlive(pid)) {
          return true;
        }
      }
      return false;
    });

    const needCleanFiles = [].concat(logs).concat(sockets);

    removeFiles(exports.logdir, needCleanFiles, callback);
  });
};

exports.init = function (config) {
  exports.logdir = config.logdir;
};

exports.run = function (callback) {
  if (!exports.logdir) {
    return callback(new Error('Not specific logdir in agentx config file'));
  }

  cleanOldLogs(function (err) {
    if (err) {
      return callback(err);
    }

    // nothing to report
    callback(null);
  });
};

exports.reportInterval = 24 * 60 * 60 * 1000; // 1 day
