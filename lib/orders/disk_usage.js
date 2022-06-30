'use strict';

const path = require('path');

const helper = require('../utils');

var command = '';
var disks = [];

exports.init = function (config) {
  command = path.join(config.cmddir, 'get_disk_usage');
  if (config.disks) {
    disks = config.disks;
  }
};

exports.run = function (callback) {
  // '/dev/sda6         14674404 13161932    744012      95% /'
  // '/dev/sda3         80448976 67999076   8340248      90% /home/admin/'

  helper.execFile(command, disks, function (err, stdout) {
    if (err) {
      return callback(err);
    }
    var metric = {};
    var results = stdout.trim();
    var lines = results.split('\n');
    lines.forEach(function(line) {
      if (line.startsWith('/')) {
        var match = line.match(/(\d+)%\s+(\/.*$)/);
        if (match) {
          var rate = parseInt(match[1] || 0);
          var mounted = match[2];
          if (!mounted.startsWith('/Volumes/') && !mounted.startsWith('/private/')) {
            metric[mounted] = rate;
          }
        }
      }
    });

    if (disks.length > 0) {
      metric['used_percent'] = metric[disks[0]] || 0;
    } else {
      metric['used_percent'] = metric['/'] || 0;
    }

    callback(null, {
      type: 'disk_usage',
      metrics: metric
    });
  });
};

exports.reportInterval = 5 * 60 * 1000; // 5 minutes
