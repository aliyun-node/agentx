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
var totalMemory = 0;
exports.isDocker = isDocker;
exports.isLinux = isLinux;
exports.cpuNumber = cpuNumber;

/*
  @2018-10-09
  agentx works at linux, osx and docker, no windows support.

  how to check if is in docker
    1. If os.type() is not 'Linux', it is not in docker.
    2. If file /.dockerenv exists, it is in docker.
    3. Else if some line in file /proc/self/cgroup starts with '/docker/' or
       '/system.slice/docker', it is in docker
    4. Else it is not in docker.

  cpu calculation algorithm:

    linux: from /proc/stat
      cpu user    nice  system idle     iowait irq softirq steal guest guest_nice
      cpu 2013085 11460 631718 12778222 173813 0   7792    0     0     0

      total = user + nice + system + idle + iowait + irq + softirq + steal + guest
      idle = idle + iowait + steal
      %cpu = 1 - delta_idle / delta_total;

    docker: if use the same algorithm with linux, the cpu usage is the host, not docker.

      Read all processes' used cpu from /proc/<pid>/stat (unit is jiffies)

      used: utime + stime + cutime + cstime (unit: jiffies)

      ref: http://man7.org/linux/man-pages/man5/proc.5.html
      jiffies:
        HZ = getconf CLK_TCK (Linux system timer fired times every second)
        jiffies / HZ = time in second
        by default, or normally HZ = 100, then
        one jiffy is 1 / 100 = 10ms

      total cpu usage is: sum(processes cpu usage) / system_time_diff_in_ms / cpuNumber

      How to get cpuNumber for a docker env:
        period: /sys/fs/cgroup/cpu/cpu.cfs_period_us
        quota:  /sys/fs/cgroup/cpu/cpu.cfs_quota_us
        cpus:   /sys/fs/cgroup/cpuset/cpuset.cpus
        min(quota/period, cpus)

        cpu.share is not considered as agentx in docker does not know other dockers in the same host.

    others:
      if env is either linux or docker, it is osx.
      use os.cpus() calculate cpu usage
      total: time.user + time.nice + time.sys + time.idle;
      idle:  time.idle;

  memory usage algorithm:

    Get total memroy when init
      docker
        limit:      /sys/fs/cgroup/memory/memory.limit_in_bytes
        soft_limit: /sys/fs/cgroup/memory/memory.soft_limit_in_bytes
        total = min(limit, soft_limit)
      linux and others:
        os.totalmem()

    Get free memory
      linux: Read from /proc/meminfo
        if os.release() >= '3.14' read 'MemAvailable' from /proc/meminfo
        else Sum('MemFree', 'Buffers', 'Cached') from /proc/meminfo

      docker:
        total - /sys/fs/cgroup/memory/memory.usage_in_bytes

      others:
        os.freemem()
*/

var getCgroupBaseDir = function () {
  // \' \' is needed
  var command = 'mount|grep cgroup/memory|awk \'{print $3}\'';
  var cgroup_mem_dir = '';
  try {
    cgroup_mem_dir = execSync(command, { encoding: 'utf8', stdio: 'ignore' }).trim();
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
  fs.readFile('/proc/stat', 'utf8', function (err, data) {
    if (err) {
      return callback(err);
    }
    var lines = data.trim().split('\n');
    for (let idx = 0; idx < lines.length; idx++) {
      let match = lines[idx].match(/^cpu \s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
      if (match) {
        let total = 0;
        for (let j = 0; j < 8; j++) {
          total += parseInt(match[j + 1], 10);
        }
        let idle = parseInt(match[4], 10) +
          parseInt(match[5], 10) + parseInt(match[8], 10);

        let diffTotal = total - lastTotal;
        let diffIdle = idle - lastIdle;
        lastTotal = total;
        lastIdle = idle;
        if (diffTotal === 0) {
          return callback(new Error('called too frequently'));
        }
        return callback(null, 1 - diffIdle / diffTotal);
      }
    }
    return callback(null, 0);
  });
};

var initClkTck = function () {
  var clk_tck;
  try {
    clk_tck = execSync('getconf CLK_TCK', { encoding: 'utf8' }).trim();
  } catch (err) {
    return;
  }
  CLK_TCK = Number(clk_tck) > 0 ? clk_tck : CLK_TCK;
};

var isInDocker = function () {
  if (!isLinux) {
    return false;
  }

  if (fs.existsSync('/.dockerenv')) {
    return true;
  }

  // .dockerenv not exists
  if (!fs.existsSync('/proc/self/cgroup')) {
    return false;
  }

  // check .dockerenv
  var raw = fs.readFileSync('/proc/self/cgroup', 'utf8').trim().split('\n');
  return raw.some(line => {
    if (line.includes('device') || line.includes('cpu')) {
      return line.split(':').some(item => item.startsWith('/docker/') || item.startsWith('/system.slice/docker'));
    }
  });
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
    // 0-3,4,6-7
    // --cpuset-cpus="1-3,0", cpuset.cpus = 0-3
    // --cpuset-cpus="1-2,2-3", cpuset.cpus = 1-3
    // duplicated cpuset already handled by docker itself
    var cpus = fs.readFileSync(cpus_path, 'utf8').trim().split(',');
    for (var i = 0; i < cpus.length; i++) {
      if (cpus[i].includes('-')) {
        var c = cpus[i].split('-');
        cpuset_cpus += Number(c[1]) - Number(c[0]) + 1;
      } else if (!isNaN(cpus[i])) {
        cpuset_cpus++;
      }
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
};


var ispid = function (s) {
  return /[0-9]+/.test(s);
};

var getUsedCpuFromProc = function (file, callback) {
  // process exists when get processes, process exit when read stat
  fs.stat(file, function (err) {
    if (err) {
      return callback(null, 0);
    }
    fs.readFile(file, 'utf8', function (err, data) {
      if (err) {
        return callback(null, 0);
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

var getAllUsedCpuFromProc = function (callback) {
  const dir = '/proc';
  var processes = [];
  fs.readdir(dir, function (err, files) {
    if (err) {
      return callback(err);
    }
    if (files.length === 0) {
      // impossible
      return callback(null, 0);
    }
    processes = files
      .map(file => ispid(file) && path.join(dir, file, 'stat'))
      .filter(file => file);

    var cntr = processes.length;
    var finished = 0;
    var total = 0;
    var done = function (err, x) {
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

var dockerCpuUsage = function (callback) {
  getAllUsedCpuFromProc(function (err, cpu) {
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
    dockerCpuUsage(function (err, cpu) {
      if (err) {
        return callback(err);
      }
      return callback(null, cpu);
    });
  } else if (isLinux) {
    linuxCpuUsage(function (err, cpu) {
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
  if (!isLinux) {
    return callback(null, os.loadavg());
  }

  fs.readFile('/proc/loadavg', 'utf8', function (err, data) {
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

var dockerFreeMemory = function (callback) {
  const mem_used_path = path.join(cgroupBaseDir, '/memory/memory.usage_in_bytes');
  fs.readFile(mem_used_path, 'utf8', function (err, data) {
    if (err) {
      return callback(err);
    }
    var used = Number(data.trim());
    return callback(null, totalMemory - used);
  });
};

/*
  MemTotal:        7852888 kB
  MemFree:          635184 kB
  MemAvailable:    1877656 kB
  Buffers:          701844 kB
  Cached:          1307420 kB
  SwapCached:       232084 kB
*/

var linuxFreeMemroy = function (callback) {
  var isMemAvailable = os.type() === 'Linux' && os.release() >= '3.14';
  var free = 0;
  fs.readFile('/proc/meminfo', 'utf8', function (err, data) {
    if (err) {
      return callback(err);
    }
    var usage = data.trim().split('\n');
    usage.forEach(function (line) {
      var pair = line.split(':');

      if (isMemAvailable) {
        if (pair[0] === 'MemAvailable') {
          free =  parseInt(pair[1], 10) * 1024;
        }
      } else {
        if (['MemFree', 'Buffers', 'Cached'].indexOf(pair[0]) >= 0) {
          free += parseInt(pair[1], 10) * 1024;
        }
      }
    });
    if (free) {
      return callback(null, free);
    }
    return callback(null, os.freemem());
  });
};

var getFreeMemory = function (callback) {
  if (isDocker) {
    dockerFreeMemory(function (err, mem) {
      if (err) {
        // hanle the scenario: no limit for docker memory
        linuxFreeMemroy(function (err, mem) {
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
    linuxFreeMemroy(function (err, mem) {
      if (err) {
        return callback(err);
      }
      return callback(null, mem);
    });
  } else {
    return callback(null, os.freemem());
  }
};

var initTotalMemory = function() {
  totalMemory = os.totalmem();
  if (!isDocker) {
    // keep os.totalmem()
    return;
  }

  const mem_limit_path = path.join(cgroupBaseDir, '/memory/memory.limit_in_bytes');
  const mem_soft_limit_path = path.join(cgroupBaseDir, '/memory/memory.soft_limit_in_bytes');

  if (!fs.existsSync(mem_limit_path) || !fs.existsSync(mem_soft_limit_path)) {
    // keep os.totalmem() if limit or soft_limit not exists
    return;
  }

  const limit = Number(fs.readFileSync(mem_limit_path, 'utf8').trim().split('\n'));
  const soft_limit = Number(fs.readFileSync(mem_soft_limit_path, 'utf8').trim().split('\n'));
  if ((limit > Number.MAX_SAFE_INTEGER || isNaN(limit)) &&
    (soft_limit > Number.MAX_SAFE_INTEGER || isNaN(soft_limit))) {
    // if > MAX_SAFE_INTEGER no limit
    // if no limit or NaN, ignore it
    return;
  }

  if (limit > Number.MAX_SAFE_INTEGER || isNaN(limit)) {
    totalMemory = soft_limit;
    return;
  }

  if (soft_limit > Number.MAX_SAFE_INTEGER || isNaN(soft_limit)) {
    totalMemory = limit;
    return;
  }

  totalMemory = soft_limit < limit ? soft_limit : limit;
};

exports.init = function (config) {
  lastTotal = 0;
  lastIdle = 0;
  initClkTck();
  isLinux = os.type() === 'Linux';
  cpuNumber = os.cpus().length;
  if (config && config.hasOwnProperty('isDocker')) {
    isDocker = !!config.isDocker;
  } else {
    isDocker = isInDocker();
  }

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

  initTotalMemory();
};

exports.run = function (callback) {
  var result = {
    type: 'system',
    metrics: { cpu_count: cpuNumber, uptime: os.uptime() }
  };

  result.metrics.totalmem = totalMemory;
  getFreeMemory(function (err, freemem) {
    if (err) {
      return callback(err);
    }
    result.metrics.freemem = freemem;
    getLoadAvg(function (err, load) {
      if (err) {
        return callback(err);
      }
      result.metrics.load1 = load[0];
      result.metrics.load5 = load[1];
      result.metrics.load15 = load[2];
      getCpuUsage(function (err, cpu) {
        if (err) {
          return callback(err);
        }
        result.metrics.cpu = cpu;
        return callback(null, result);
      });
    });
  });
};
