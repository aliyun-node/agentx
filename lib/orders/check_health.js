'use strict';

exports.run = function () {
  var memoryUsage = process.memoryUsage();
  if (memoryUsage.rss > exports.memoryLimit) {
    process.exit(1);
  }
};

exports.reportInterval = 10 * 1000; // 10s
exports.memoryLimit = 200 * 1024 * 1024; // 200m