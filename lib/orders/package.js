'use strict';

const fs = require('fs');

exports.init = function (config) {
  exports.packages = config.packages;
};

const readFile = function (packagePath, callback) {
  fs.readFile(packagePath, 'utf8', function (err, json) {
    if (err) {
      return callback(err);
    }
    let pack;
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

const readFiles = function (packages, callback) {
  const total = packages.length;
  let current = 0;
  let called = false;
  const results = [];
  const done = function (err, data) {
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
  const packages = exports.packages;
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
