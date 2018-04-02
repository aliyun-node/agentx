'use strict';

var fs = require('fs');
var path = require('path');
var helper = require('../utils');

exports.coredir = [];

// if user renamed core file, then only check those with the prefix
var coreFileNamePrefix = 'core';

var listCoreFiles = function () {
  var corelist = {ok: true, data:[]};

  for (var i = 0; i < exports.coredir.length; i++) {
    var dir = exports.coredir[i];
    var files = fs.readdirSync(dir);
    for (var j = 0; j < files.length; j++) {
      if (files[j].indexOf(coreFileNamePrefix) === 0) {
        var file = path.join(dir, files[j]);
        var stat = fs.statSync(file);
        corelist.data.push({
          path: file,
          size: stat.size,
          ctime: stat.ctime
        });
      }
    }
  }
  return corelist;
};

exports.init = function (config) {
  // if user specified core file dir, check this dir
  if (config && config.coredir) {
    exports.coredir = config.coredir;
    return;
  }

  // core file dir is specified by /proc/sys/kernal/core_pattern
  // e.g. '/tmp/core_%e.%p'
  exports.coredir = [];
  var patt = fs.readFileSync('/proc/sys/kernel/core_pattern', 'utf8').trim().split(' ')[0];
  if (patt.indexOf('%') > 0) {
    // /tmp/core_%e.%p
    // exports.coredir = ['/tmp']
    // coreFileNamePrefix = 'core_'
    exports.coredir.push((path.parse(patt).dir));
    coreFileNamePrefix = path.parse(patt).name.split('%')[0];
  }
  // otherwise, coredump is handled by another process...not checked.
};

exports.run = function (callback) {
  if (exports.coredir.length === 0) {
    return callback(new Error('core dir not specified.'));
  }

  callback(null, {
    type: 'corelist',
    core: listCoreFiles()
  });
};

exports.reportInterval = 1 * 1000; // 1 min
