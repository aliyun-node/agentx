'use strict';

var os = require('os');
var fs = require('fs');

var lastTotal = 0;
var lastIdle = 0;

var calculateCPU = function () {
  var cpus = os.cpus();
  var total = 0;
  var idle = 0;
  for (var i = 0; i < cpus.length; i++) {
    var time = cpus[i].times;
    total += time.user + time.nice + time.sys + time.idle;
    idle += time.idle;
  }

  var diffTotal = total - lastTotal;
  var diffIdle = idle - lastIdle;
  lastTotal = total;
  lastIdle = idle;

  return 1 - diffIdle / diffTotal;
};

var getMemoryUsage = function () {
  var raw = fs.readFileSync('/proc/meminfo');
  var usage = raw.toString().trim().split('\n');
  var real_free = 0;

  usage.forEach(function(line) {
    var pair = line.split(':');
    if (['MemFree', 'Buffers', 'Cached'].indexOf(pair[0]) >= 0) {
      real_free += parseInt(pair[1]);
    }
  });
  return real_free * 1024;
}

var status = function () {
  var loadavg = os.loadavg();
  return {
    uptime: os.uptime(), // in ms
    totalmem: os.totalmem(), // in byte
    freemem: os.type() === 'Linux' ? getMemoryUsage() : os.freemem(), // in byte
    load1: loadavg[0],
    load5: loadavg[1],
    load15: loadavg[2],
    cpu: calculateCPU(),
    cpu_count: os.cpus().length
  };
};

exports.run = function (callback) {
  callback(null, {
    type: 'system',
    metrics: status()
  });
};

