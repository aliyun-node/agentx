'use strict';

const path = require('path');

const helper = require('../utils');

var command = '';

exports.init = function (config) {
  command = path.join(config.cmddir, 'get_processes_count');
};

exports.run = function (callback) {
  helper.execFile(command, ['node'], function (err, stdout) {
    if (err) {
      return callback(err);
    }

    callback(null, {
      type: 'processes_count',
      metrics: {
        node_count: parseInt(stdout.trim(), 10)
      }
    });
  });
};
