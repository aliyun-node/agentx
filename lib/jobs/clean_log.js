'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');

const helper = require('../utils');

const readdirAsync = util.promisify(fs.readdir);
const unlinkAsync = util.promisify(fs.unlink);

// 日志保留天数
const KEEP_DAYS = 7;
const SECONDS_PER_DAY = 86400;

const patt = /^(node|access|tracing)-(\d{8})\.log$/;
const alinodeSocketPatt = /^(alinode-uds-path)-(\d+)$/;

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

class CleanLogJob {
  constructor(config) {
    // 日志路径
    this.logdir = config.logdir;
  }

  async run() {
    if (!this.logdir) {
      throw new Error('Not specific logdir in agentx config file');
    }

    const files = await readdirAsync(this.logdir);
    const now = new Date();
    const today = parseInt(helper.getYYYYMMDD(now), 10);
    const logs = files.filter((filename) => {
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

    const needCleanFiles = [...logs, ...sockets];

    for (let i = 0; i < needCleanFiles.length; i++) {
      const filename = needCleanFiles[i];
      const filepath = path.join(this.logdir, filename);
      console.log('clean old log or domain socket file file: %s', filepath);
      await unlinkAsync(filepath);
    }

    // nothing to report
    return null;
  }

  // 1 day
  static reportInterval = 24 * 60 * 60 * 1000;
}

module.exports = CleanLogJob;
