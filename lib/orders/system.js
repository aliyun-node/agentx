'use strict';

var os = require('os');

var last_total = 0;
var last_idle = 0;

var calculateCPU = function () {
  var cpus = os.cpus();
  var total = 0;
  var idle = 0;
  for (var i = 0; i < cpus.length; i++) {
    var time = cpus[i].times;
    total += time.user + time.nice + time.sys + time.idle;
    idle += time.idle;
  }

  var diff_total = total - last_total;
  var diff_idle = idle - last_idle;
  last_total = total;
  last_idle = idle;

  return 1 - diff_idle / diff_total;
};

var status = function () {
  var loadavg = os.loadavg();
  return {
    uptime: os.uptime(), // in ms
    totalmem: os.totalmem(), // in byte
    freemem: os.freemem(), // in byte
    load1: loadavg[0],
    load5: loadavg[1],
    load15: loadavg[2],
    cpu: calculateCPU()
  };
};

exports.run = function (callback) {
  callback(null, {
    type: 'system',
    metrics: status()
  });
};

