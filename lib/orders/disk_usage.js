'use strict';

var path = require('path');
var helper = require('../utils');

var command = '';

exports.init = function (config) {
  command = path.join(config.cmddir, 'get_disk_usage');
};

exports.run = function (callback) {
  helper.execFile(command, function (err, stdout) {
    if (err) {
      return callback(err);
    }

    var results = stdout.trim();
    var lines = results.split('\n');
    var root = lines.filter(function (line) {
      return line.match(/\/$/ig);
    }).join('');

    // '/dev/disk1     487849760 454136600  33201160    94%    /'

    var percent = root.match(/(\d+)%/);

    callback(null, {
      type: 'disk_usage',
      metrics: {
        'used_percent': parseInt(percent && percent[1]) || 0
      }
    });
  });
};
