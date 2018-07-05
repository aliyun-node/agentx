'use strict';

const path = require('path');
const helper = require('../utils');

var command = '';

exports.init = function (config) {
  command = path.join(config.cmddir, 'get_node_version');
};

exports.run = function (callback) {
  helper.execFile(command, function (err, stdout) {
    if (err) {
      return callback(err);
    }

    callback(null, {
      type: 'version',
      metrics: {
        node: stdout.trim()
      }
    });
  });
};

exports.reportInterval = 60 * 60 * 1000; // 1 hour
