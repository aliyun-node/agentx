'use strict';

var os = require('os');
var fs = require('fs');
var path = require('path');
var execSync = require('child_process').execSync;

var lastTotal = 0;
var lastIdle = 0;
var isDocker = false;
var isLinux = true;
var cpuNumber = os.cpus().length;
var last_used = 0;
var last_sys = 0;
var CLK_TCK = 100; // by default is 100 ticks per second
var cgroupBaseDir = '/sys/fs/cgroup';
exports.isDocker = isDocker;
exports.isLinux = isLinux;
exports.cpuNumber = cpuNumber;

var getCgroupBaseDir = function() {
  // \' \' is needed
  var command = 'mount|grep cgroup/memory|awk \'{print $3}\'';
  var cgroup_mem_dir = '';
  try {
    cgroup_mem_dir = execSync(command, {encoding: 'utf8'}).trim();
  } catch (e) {
    // err can be ignored, use the default /sys/fs/cgroup
  }
  if (cgroup_mem_dir && cgroup_mem_dir.startsWith('/') && cgroup_mem_dir.endsWith('memory')) {
    return path.parse(cgroup_mem_dir).dir;
  }
  return '/sys/fs/cgroup';
};

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

var linuxCpuUsage = function (callback) {
  fs.readFile('/proc/stat', 'utf8', function(err, data) {
    if (err) {
      return callback(err);
    }
    var lines = data.trim().split('\n');
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

        if (diffTotal === 0) {
          return callback(new Error('called too frequently'));
        }
        return callback(null, 1 - diffIdle / diffTotal);
      }
    }
    callback(null, 0);
  });
};

var initClkTck = function() {
  try {
    var clk_tck = parseInt(execSync('getconf CLK_TCK', {encoding: 'utf8'}).trim(), 10);
    if (Number.isNaN(clk_tck) || clk_tck === 0) {
      CLK_TCK = 100;
    } else {
      CLK_TCK = clk_tck;
    }
  } catch (e) {
    CLK_TCK = 100;
  }
};

var isInDocker = function () {
  if (!isLinux) {
    return false;
  }
  try {
    var raw = fs.readFileSync('/proc/self/cgroup', 'utf8').trim().split('\n');
    for (var i = 0; i < raw.length; i++) {
      if (raw[i].indexOf('device') >= 0 || raw[i].indexOf('cpu') >= 0) {
        var one = raw[i].split(':');
        if (one[2].indexOf('/docker/') >= 0 || one[2].indexOf('/system.slice/docker') >= 0) {
          return true;
        }
      }
    }
    if (fs.existsSync('/.dockerenv')) {
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
};

/*
  returns the allocated cpu count, if not spicified when start container,
  container can use cpu as much as the host's cpu resource.
*/
var getDockerCpuNumber = function () {
  const period_path = path.join(cgroupBaseDir, '/cpu/cpu.cfs_period_us');
  const quota_path = path.join(cgroupBaseDir, '/cpu/cpu.cfs_quota_us');
  const cpus_path = path.join(cgroupBaseDir, '/cpuset/cpuset.cpus');
  var docker_cpu_number = cpuNumber;
  var cpuset_cpus = 0;

  if (fs.existsSync(cpus_path)) {
    try {
      // 0-3,4,6-7
      // --cpuset-cpus="1-3,0", cpuset.cpus = 0-3
      // --cpuset-cpus="1-2,2-3", cpuset.cpus = 1-3
      // duplicated cpuset already handled by docker itself
      var cpus = fs.readFileSync(cpus_path, 'utf8').trim().split(',');
      for (var i = 0; i < cpus.length; i++) {
        if (cpus[i].includes('-')) {
          var c = cpus[i].split('-');
          cpuset_cpus += parseInt(c[1], 10) - parseInt(c[0], 10) + 1;
        } else {
          if (!Number.isNaN(parseInt(cpus[i]), 10)) {
            cpuset_cpus++;
          }
        }
      }
      if (Number.isNaN(cpuset_cpus)) {
        cpuset_cpus = 0;
      }
    } catch (e) {
      cpuset_cpus = 0;
    }
  }

  if (cpuset_cpus > 0 && cpuset_cpus < docker_cpu_number) {
    docker_cpu_number = cpuset_cpus;
  }

  if (!fs.existsSync(period_path)) {
    return docker_cpu_number;
  }

  if (!fs.existsSync(quota_path)) {
    return docker_cpu_number;
  }

  try {
    var quota = parseInt(fs.readFileSync(quota_path, 'utf8').trim(), 10);
    if (quota === -1) {
      return docker_cpu_number;
    }

    var period = parseInt(fs.readFileSync(period_path, 'utf8').trim(), 10);
    if (period <= 0) {
      return docker_cpu_number;
    }

    if (quota / period < docker_cpu_number) {
      docker_cpu_number = quota / period;
    }
    return docker_cpu_number;
  } catch (err) {
    return docker_cpu_number;
  }
};


var ispid = function (s) {
  for (let i = 0; i < s.length; i++) {
    if ('0123456789'.indexOf(s[i]) < 0) {
      return false;
    }
  }
  return true;
};

var getUsedCpuFromProc = function(file, callback) {
  // process exists when get processes, process exit when read stat
  fs.stat(file, function(err, stat) {
    if (err) {
      return callback(err, 0);
    }
    fs.readFile(file, 'utf8', function(err, data) {
      if(err) {
        return callback(err, 0);
      }
      if (data) {
        var pstat = data.trim().split(' ');
        var used = parseInt(pstat[13], 10) +
                parseInt(pstat[14], 10) +
                parseInt(pstat[15], 10) +
                parseInt(pstat[16], 10);
        return callback(null, used);
      }
      return callback(null, 0);
    });
  });
};

var getAllUsedCpuFromProc = function(callback) {
  const dir = '/proc';
  var processes = [];
  fs.readdir(dir, function(err,files) {
    if (err) {
      return callback(err);
    }
    if (files.length === 0) {
      // impossible
      return callback(null, 0);
    }
    files.forEach(function(filename) {
      if (ispid(filename)) {
        processes.push(path.join(dir, filename, 'stat'));
      }
    });

    var cntr = processes.length;
    var finished = 0;
    var total = 0;
    var done = function(err, x) {
      finished++;
      total += x;
      if (finished === cntr) {
        return callback(err, total);
      }
    };
    for (let i = 0; i < cntr; i++) {
      getUsedCpuFromProc(processes[i], done);
    }
  });
};

var dockerCpuUsage = function(callback) {
  getAllUsedCpuFromProc(function(err, cpu) {
    if (err) {
      return callback(err);
    }
    var used = cpu;
    var sys = new Date().getTime();
    var diff_used = (used - last_used) * (1000 / CLK_TCK);
    var diff_sys = sys - last_sys;
    last_used = used;
    last_sys = sys;
    if (diff_sys === 0) {
      return callback(null, 0);
    }
    return callback(null, diff_used / diff_sys / cpuNumber);
  });
};


var cpuUsage = function () {
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

var getCpuUsage = function (callback) {
  // check order is important, please don't check linux firstly
  if (isDocker) {
    dockerCpuUsage(function(err, cpu) {
      if (err) {
        return callback(err);
      }
      return callback(null, cpu);
    });
  } else if (isLinux) {
    linuxCpuUsage(function(err, cpu) {
      if (err) {
        return callback(err);
      }
      return callback(null, cpu);
    });
  } else {
    var other = cpuUsage();
    return callback(null, other);
  }
};

var getLoadAvg = function (callback) {
  fs.readFile('/proc/loadavg', 'utf8', function(err, data) {
    if (err) {
      return callback(err);
    }
    var load = data.trim();
    const reg = /(\d+.\d+)\s+(\d+.\d+)\s+(\d+.\d+)/;
    const loads = load.match(reg);
    if (loads) {
      return callback(null, [Number(loads[1]), Number(loads[2]), Number(loads[3])]);
    }
    return callback(null, os.loadavg());
  });
};

var dockerMemory = function(callback) {
  const mem_limit_path =  path.join(cgroupBaseDir, '/memory/memory.limit_in_bytes');
  const mem_soft_limit_path = path.join(cgroupBaseDir, '/memory/memory.soft_limit_in_bytes');
  const mem_used_path = path.join(cgroupBaseDir, '/memory/memory.usage_in_bytes');

  fs.readFile(mem_limit_path, 'utf8', function(err, data) {
    if (err) {
      return callback(err);
    }
    var limit = Number(data.trim());
    fs.readFile(mem_soft_limit_path, 'utf8',function(err, data) {
      if (err) {
        return callback(err);
      }
      var soft_limit = Number(data.trim());
      if (limit > Number.MAX_SAFE_INTEGER && soft_limit > Number.MAX_SAFE_INTEGER) {
        // no memory limit
        return callback(new Error('no memory limit for docker'));
      }
      fs.readFile(mem_used_path, 'utf8', function(err, data) {
        if (err) {
          return callback(err);
        }
        var used = Number(data.trim());
        var total = soft_limit < limit ? soft_limit : limit;
        return callback(null, {total: total, free: total - used});
      });
    });
  });
};

var linuxMemroy = function(callback) {
  var isMemAvailable = os.type() === 'Linux' && os.release() >= '3.14';
  var mem = {free: 0, total: 0};
  fs.readFile('/proc/meminfo', 'utf8',function(err, data) {
    if (err) {
      return callback(err);
    }
    var usage = data.trim().split('\n');
    usage.forEach(function(line) {
      var pair = line.split(':');
      if (pair[0] === 'MemTotal') {
        mem.total = parseInt(pair[1], 10) * 1024;
      }
      if (isMemAvailable) {
        if (pair[0] === 'MemAvailable') {
          mem.free = parseInt(pair[1], 10) * 1024;
        }
      } else {
        if (['MemFree', 'Buffers', 'Cached'].indexOf(pair[0]) >= 0) {
          mem.free += parseInt(pair[1], 10) * 1024;
        }
      }
    });
    if (mem.total > 0) {
      return callback(null, mem);
    }
    mem.total = os.totalmem();
    mem.free = os.freemem();
    return callback(null, mem);
  });
};


var getMemory = function(callback) {
  if (isDocker) {
    dockerMemory(function(err, mem) {
      if (err) {
        // hanle the scenario: no limit for docker memory
        linuxMemroy(function(err, mem) {
          if (err) {
            return callback(err);
          }
          return callback(null, mem);
        });
      } else {
        return callback(null, mem);
      }
    });
  } else if (isLinux) {
    linuxMemroy(function(err, mem) {
      if (err) {
        return callback(err);
      }
      return callback(null, mem);
    });
  } else {
    return callback(null, {total: os.totalmem(), free: os.freemem()});
  }
};


exports.init = function (callback) {
  lastTotal = 0;
  lastIdle = 0;
  initClkTck();
  isLinux = os.type() === 'Linux';
  cpuNumber = os.cpus().length;
  isDocker = isInDocker();
  exports.isDocker = isDocker;
  exports.isLinux = isLinux;
  exports.cpuNumber = cpuNumber;

  if (isDocker) {
    cpuNumber = getDockerCpuNumber();
    cgroupBaseDir = getCgroupBaseDir();
    exports.cgroupBaseDir = cgroupBaseDir;
    exports.cpuNumber = cpuNumber;
    last_sys = 0;
    last_used = 0;
  }
};

exports.run = function (callback) {
  var result = {
    type: 'system',
    metrics: {cpu_count: cpuNumber, uptime: os.uptime()}
  };

  getMemory(function(err, mem) {
    if (err) {
      return callback(err);
    }
    result.metrics.totalmem = mem.total;
    result.metrics.freemem = mem.free;
    getLoadAvg(function(err, load) {
      if (err) {
        return callback(err);
      }
      result.metrics.load1 = load[0];
      result.metrics.load5 = load[1];
      result.metrics.load15 = load[2];
      getCpuUsage(function(err, cpu) {
        if (err) {
          return callback(err);
        }
        result.metrics.cpu = cpu;
        return callback(null, result);
      });
    });
  });
};
