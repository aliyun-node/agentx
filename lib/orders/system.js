'use strict';

var os = require('os');
var fs = require('fs');

var lastTotal = 0;
var lastIdle = 0;

/*
*      user  nice system idle    iowait irq  softirq steal guest  guest_nice
* cpu  74608 2520 24433  1117073 6176   4054 0       0     0      0
*
* Idle = idle + iowait + steal
* NonIdle = user + nice + system + irq + softirq + steal
* Total = Idle + NonIdle;
* cpu% = 1 - diffIdle / diffTotal
* this is a description for "steal", it is useful in a VM env.
* http://blog.scoutapp.com/articles/2013/07/25/understanding-cpu-steal-time-when-should-you-be-worried
*/
var calculateLinuxCPU = function () {
  var raw = fs.readFileSync('/proc/stat');
  if (!raw) {
    return 0;
  }

  var lines = raw.toString().trim().split('\n');
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].indexOf('cpu ') >= 0) {
      var stat = lines[i].split(' ');
      // [ 'cpu', '', '327248', '602', '82615', '1556436',
      //              '22886', '0', '134', '0', '0', '0' ]
      stat.shift();
      stat.shift();
      var idle = parseInt(stat[3], 10) +
          parseInt(stat[4], 10) + parseInt(stat[7], 10);
      var total = 0;
      for (var j = 0; j < 8; j++) {
        total += parseInt(stat[j], 10);
      }
      var diffTotal = total - lastTotal;
      var diffIdle = idle - lastIdle;
      lastTotal = total;
      lastIdle = idle;
      return 1 - diffIdle / diffTotal;
    }
  }
  return 0;
};



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
      real_free += parseInt(pair[1], 10);
    }
  });
  return real_free * 1024;
};

var status = function () {
  var loadavg = os.loadavg();
  return {
    uptime: os.uptime(), // in ms
    totalmem: os.totalmem(), // in byte
    freemem: os.type() === 'Linux' ? getMemoryUsage() : os.freemem(), // in byte
    load1: loadavg[0],
    load5: loadavg[1],
    load15: loadavg[2],
    cpu: os.type() === 'Linux' ? calculateLinuxCPU() : calculateCPU(),
    cpu_count: os.cpus().length
  };
};

exports.run = function (callback) {
  callback(null, {
    type: 'system',
    metrics: status()
  });
};

