'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

function hasOwnProperty(target, key) {
  if (typeof Object.hasOwn === 'function') {
    return Object.hasOwn(target, key);
  }

  return Object.prototype.hasOwnProperty.call(target, key);
}

let lastTotal = 0;
let lastIdle = 0;
let isDocker = false;
let isLinux = true;
let cpuNumber = os.cpus().length;
let last_used = 0;
let last_sys = 0;
let CLK_TCK = 100; // by default is 100 ticks per second
let cgroupBaseDir = '/sys/fs/cgroup';
let totalMemory = 0;
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

const getCgroupBaseDir = function () {
  // \' \' is needed
  const command = 'mount|grep cgroup/memory|awk \'{print $3}\'';
  let cgroup_mem_dir = '';
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

const linuxCpuUsage = function (callback) {
  fs.readFile('/proc/stat', 'utf8', function (err, data) {
    if (err) {
      return callback(err);
    }
    const lines = data.trim().split('\n');
    for (let idx = 0; idx < lines.length; idx++) {
      const match = lines[idx].match(/^cpu \s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
      if (match) {
        let total = 0;
        for (let j = 0; j < 8; j++) {
          total += parseInt(match[j + 1], 10);
        }
        const idle = parseInt(match[4], 10) +
          parseInt(match[5], 10) + parseInt(match[8], 10);

        const diffTotal = total - lastTotal;
        const diffIdle = idle - lastIdle;
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

const initClkTck = function () {
  let clk_tck;
  try {
    clk_tck = execSync('getconf CLK_TCK', { encoding: 'utf8' }).trim();
  } catch (err) {
    return;
  }
  CLK_TCK = Number(clk_tck) > 0 ? clk_tck : CLK_TCK;
};

const isInDocker = function () {
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
  const raw = fs.readFileSync('/proc/self/cgroup', 'utf8').trim().split('\n');
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
const getDockerCpuNumber = function () {
  const period_path = path.join(cgroupBaseDir, '/cpu/cpu.cfs_period_us');
  const quota_path = path.join(cgroupBaseDir, '/cpu/cpu.cfs_quota_us');
  const cpus_path = path.join(cgroupBaseDir, '/cpuset/cpuset.cpus');
  let docker_cpu_number = cpuNumber;
  let cpuset_cpus = 0;

  if (fs.existsSync(cpus_path)) {
    // 0-3,4,6-7
    // --cpuset-cpus="1-3,0", cpuset.cpus = 0-3
    // --cpuset-cpus="1-2,2-3", cpuset.cpus = 1-3
    // duplicated cpuset already handled by docker itself
    const cpus = fs.readFileSync(cpus_path, 'utf8').trim().split(',');
    for (let i = 0; i < cpus.length; i++) {
      if (cpus[i].includes('-')) {
        const c = cpus[i].split('-');
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

  const quota = parseInt(fs.readFileSync(quota_path, 'utf8').trim(), 10);
  if (quota === -1) {
    return docker_cpu_number;
  }

  const period = parseInt(fs.readFileSync(period_path, 'utf8').trim(), 10);
  if (period <= 0) {
    return docker_cpu_number;
  }

  if (quota / period < docker_cpu_number) {
    docker_cpu_number = quota / period;
  }
  return docker_cpu_number;
};


const ispid = function (s) {
  return /[0-9]+/.test(s);
};

const getUsedCpuFromProc = function (file, callback) {
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
        const pstat = data.trim().split(' ');
        const used = parseInt(pstat[13], 10) +
          parseInt(pstat[14], 10) +
          parseInt(pstat[15], 10) +
          parseInt(pstat[16], 10);
        return callback(null, used);
      }
      return callback(null, 0);
    });
  });
};

const getAllUsedCpuFromProc = function (callback) {
  const dir = '/proc';
  let processes = [];
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

    const cntr = processes.length;
    let finished = 0;
    let total = 0;
    const done = function (err, x) {
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

const dockerCpuUsage = function (callback) {
  getAllUsedCpuFromProc(function (err, cpu) {
    if (err) {
      return callback(err);
    }
    const used = cpu;
    const sys = Date.now();
    const diff_used = (used - last_used) * (1000 / CLK_TCK);
    const diff_sys = sys - last_sys;
    last_used = used;
    last_sys = sys;
    if (diff_sys === 0) {
      return callback(null, 0);
    }
    return callback(null, diff_used / diff_sys / cpuNumber);
  });
};


const cpuUsage = function () {
  const cpus = os.cpus();
  let total = 0;
  let idle = 0;
  for (let i = 0; i < cpus.length; i++) {
    const time = cpus[i].times;
    total += time.user + time.nice + time.sys + time.idle;
    idle += time.idle;
  }

  const diffTotal = total - lastTotal;
  const diffIdle = idle - lastIdle;
  lastTotal = total;
  lastIdle = idle;

  return 1 - diffIdle / diffTotal;
};

const getCpuUsage = function (callback) {
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
    const other = cpuUsage();
    return callback(null, other);
  }
};

const getLoadAvg = function (callback) {
  if (!isLinux) {
    return callback(null, os.loadavg());
  }

  fs.readFile('/proc/loadavg', 'utf8', function (err, data) {
    if (err) {
      return callback(err);
    }
    const load = data.trim();
    const reg = /(\d+.\d+)\s+(\d+.\d+)\s+(\d+.\d+)/;
    const loads = load.match(reg);
    if (loads) {
      return callback(null, [Number(loads[1]), Number(loads[2]), Number(loads[3])]);
    }
    return callback(null, os.loadavg());
  });
};

const dockerFreeMemory = function (callback) {
  const mem_used_path = path.join(cgroupBaseDir, '/memory/memory.usage_in_bytes');
  fs.readFile(mem_used_path, 'utf8', function (err, data) {
    if (err) {
      return callback(err);
    }
    const used = Number(data.trim());
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

const linuxFreeMemroy = function (callback) {
  const isMemAvailable = os.type() === 'Linux' && os.release() >= '3.14';
  let free = 0;
  fs.readFile('/proc/meminfo', 'utf8', function (err, data) {
    if (err) {
      return callback(err);
    }
    const usage = data.trim().split('\n');
    usage.forEach(function (line) {
      const pair = line.split(':');

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

const getFreeMemory = function (callback) {
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

const initTotalMemory = function() {
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
  if (config && hasOwnProperty(config, 'isDocker')) {
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
  const result = {
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
