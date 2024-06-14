'use strict';

const os = require('os');
const fs = require('fs');
const fsx = require('fs').promises;
const path = require('path');
const utils = require('../utils');

const REPORT_INTERVAL = 60 * 1000;

// if user renamed core file, then only check those with the
// prefix
function check(prefixList, item) {
  return prefixList.some((prefix) => {
    return item.startsWith(prefix) && !item.endsWith('.gz');
  });
}

class ListCoreJob {
  /**
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
   */
  constructor(config) {
    this.coreFileNamePrefix = ['core'];

    if (config && config.coredir) {
      if (Array.isArray(config.coredir)) {
        this.coredir = config.coredir;
      } else if (typeof config.coredir === 'string') {
        this.coredir = [config.coredir];
      } else {
        // ignore other types
        this.coredir = [];
      }
    } else {
      this.coredir = [];
    }

    // for linux, check
    // core dir specified by /proc/sys/kernal/core_pattern e.g. '/tmp/core_%e.%p'
    if (os.platform() === 'linux') {
      if (!fs.existsSync('/proc/sys/kernel/core_pattern')) {
        return;
      }

      const patt = fs.readFileSync('/proc/sys/kernel/core_pattern', 'utf8').trim().split(' ')[0];
      if (patt.indexOf('%') > 0) {
        // /tmp/core_%e.%p
        const coredir_ = path.parse(patt).dir;
        if (fs.existsSync(coredir_)) {
          try {
            fs.accessSync(coredir_, fs.R_OK);
            this.coredir.push(coredir_);
            const prefix = path.parse(patt).name.split('%')[0];
            if (prefix !== this.coreFileNamePrefix[0]) {
              this.coreFileNamePrefix.push(prefix);
            }
          } catch (e) {
            console.log(coredir_ + ' is unaccessible: ' + e.message);
          }
        }
      }
    }
  }

  async getNodePids() {
    const { stdout } = await utils.execAsync('ps -e -o pid,args | grep -E "node " | grep -v grep');
    const pids = [];
    const processes = stdout.toString().trim().split('\n');
    for (let i = 0; i < processes.length; i++) {
      if (processes[i] && processes[i].split(' ')[0]) {
        pids.push(processes[i].split(' ')[0]);
      }
    }
    return pids;
  }

  async getNodePWD(pid) {
    const path = `/proc/${pid}/environ`;
    try {
      await fsx.access(path, fs.constants.R_OK);
    } catch (err) {
    // 忽略该进程
      return null;
    }

    const env = await fsx.readFile(path, 'utf8');
    const envs = env.toString().trim().split('\u0000');
    for (let i = 0; i < envs.length; i++) {
      if (envs[i].indexOf('PWD') === 0) {
        return envs[i].split('=')[1];
      }
    }

    return null;
  }

  async findCores(dir) {
    const results = [];
    try {
      await fsx.access(dir);
    } catch (ex) {
      return results;
    }

    const files = await fsx.readdir(dir);
    for (let i = 0; i < files.length; i++) {
      if (!check(this.coreFileNamePrefix, files[i])) {
        continue;
      }
      const file = path.join(dir, files[i]);
      const stat = await fsx.stat(file);
      // bypass directory
      if (!stat.isFile()) {
        continue;
      }

      // bypass core created before agentx startup
      if (stat.ctimeMs < Date.now() - REPORT_INTERVAL) {
        continue;
      }

      results.push({
        path: file,
        size: stat.size,
        ctime: stat.ctime
      });
    }

    return results;
  }

  async run() {
    // 非 linux，不处理，不上报
    if (os.platform() !== 'linux') {
      return null;
    }

    // 查找当前运行中的 Node 进程 pid 列表
    const pids = await this.getNodePids();
    const pwds = [];
    for (let i = 0; i < pids.length; i++) {
      // 根据进程 ID，获取进程的 PWD 目录
      const pwd = await this.getNodePWD(pids[i]);
      if (pwd) {
        pwds.push(pwd);
      }
    }
    // 合并目录并去重
    const dirs = Array.from(new Set([...this.coredir, ...pwds]));
    if (dirs.length === 0) {
      return null;
    }

    // 从目录中查找符合条件的 core 文件列表
    let cores = [];
    const count = dirs.length;
    for (let i = 0; i < count; i++) {
      const dir = dirs[i];
      const list = await this.findCores(dir);
      cores = [...cores, ...list];
    }

    return {
      type: 'coredump',
      metrics: cores
    };
  }

  static reportInterval = REPORT_INTERVAL; // 1 min
}

module.exports = ListCoreJob;
