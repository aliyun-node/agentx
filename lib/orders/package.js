'use strict';

const fs = require('fs');

exports.init = function (config) {
  exports.packages = config.packages;
};

var readFile = function (packagePath, callback) {
  fs.readFile(packagePath, 'utf8', function (err, json) {
    if (err) {
      return callback(err);
    }
    var pack;
    try {
      pack = JSON.parse(json);
    } catch (ex) {
      return callback(ex);
    }

    callback(null, {
      path: packagePath,
      dependencies: pack.dependencies,
      devDependencies: pack.devDependencies
    });
  });
};

var readFiles = function (packages, callback) {
  var total = packages.length;
  var current = 0;
  var called = false;
  var results = [];
  var done = function (err, data) {
    if (called) { // only call once
      return;
    }

    if (err) {
      called = true;
      return callback(err);
    }

    current++;
    results.push(data);
    if (current >= total) {
      callback(null, results);
    }
  };

  packages.forEach(function (packagePath) {
    readFile(packagePath, done);
  });
};

exports.run = function (callback) {
  var packages = exports.packages;
  if (!packages || !packages.length) {
    return callback(null, null);
  }

  readFiles(packages, function (err, results) {
    if (err) {
      return callback(err);
    }

    callback(null, {
      type: 'package',
      metrics: results
    });
  });
};

exports.reportInterval = 60 * 60 * 1000; // 1hour
