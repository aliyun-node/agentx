'use strict';

const path = require('path');

const helper = require('../utils');

class DiskUsageJob {
  constructor(config) {
    this.command = path.join(config.cmddir, 'get_disk_usage');
    this.disks = config.disks || [];
  }

  // 5 minutes
  static reportInterval = 5 * 60 * 1000;

  async run() {
    // '/dev/sda6         14674404 13161932    744012      95% /'
    // '/dev/sda3         80448976 67999076   8340248      90% /home/admin/'
    const { stdout } = await helper.execFileAsync(this.command, this.disks);
    const metric = {};
    const results = stdout.trim();
    const lines = results.split('\n');
    lines.forEach(function(line) {
      if (line.startsWith('/')) {
        const match = line.match(/(\d+)%\s+(\/.*$)/);
        if (match) {
          const rate = parseInt(match[1] || 0);
          const mounted = match[2];
          if (!mounted.startsWith('/Volumes/') && !mounted.startsWith('/private/')) {
            metric[mounted] = rate;
          }
        }
      }
    });

    if (this.disks.length > 0) {
      metric['used_percent'] = metric[this.disks[0]] || 0;
    } else {
      metric['used_percent'] = metric['/'] || 0;
    }

    return {
      type: 'disk_usage',
      metrics: metric
    };
  }
}

module.exports = DiskUsageJob;
