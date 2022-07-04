'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;
const fsx = require('fs').promises;

function hasOwnProperty(target, key) {
  if (typeof Object.hasOwn === 'function') {
    return Object.hasOwn(target, key);
  }

  return Object.prototype.hasOwnProperty.call(target, key);
}

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

const ispid = function (s) {
  return /[0-9]+/.test(s);
};

class SystemJob {
  constructor(config) {
    this.isLinux = os.type() === 'Linux';

    if (config && hasOwnProperty(config, 'isDocker')) {
      this.isDocker = !!config.isDocker;
    } else {
      this.isDocker = this.isInDocker();
    }

    if (this.isDocker) {
      this.cgroupBaseDir = this.getCgroupBaseDir();
    }

    // cpu number
    this.cpuNumber = this.isDocker ? this.getDockerCpuNumber() : os.cpus().length;
    this.lastTotal = 0;
    this.lastIdle = 0;
    // cpu usage for docker
    this.lastSys = 0;
    this.lastUsed = 0;
    // total memory
    this.totalMemory = this.isDocker ? this.getDockerTotalMemory() : os.totalmem();

    this.CLK_TCK = this.initClkTck();
  }

  initClkTck() {
    const CLK_TCK = 100; // by default is 100 ticks per second
    let clk_tck;
    try {
      clk_tck = execSync('getconf CLK_TCK', { encoding: 'utf8' }).trim();
    } catch (err) {
      return;
    }
    return Number(clk_tck) > 0 ? clk_tck : CLK_TCK;
  }

  getCgroupBaseDir() {
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
  }

  isInDocker() {
    if (!this.isLinux) {
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
  }

  /**
   * returns the allocated cpu count, if not spicified when start container,
   * container can use cpu as much as the host's cpu resource.
   */
  getDockerCpuNumber() {
    const periodPath = path.join(this.cgroupBaseDir, '/cpu/cpu.cfs_period_us');
    const quotaPath = path.join(this.cgroupBaseDir, '/cpu/cpu.cfs_quota_us');
    const cpusPath = path.join(this.cgroupBaseDir, '/cpuset/cpuset.cpus');
    // default cpu number
    let docker_cpu_number = os.cpus().length;
    let cpuset_cpus = 0;

    if (fs.existsSync(cpusPath)) {
      // 0-3,4,6-7
      // --cpuset-cpus="1-3,0", cpuset.cpus = 0-3
      // --cpuset-cpus="1-2,2-3", cpuset.cpus = 1-3
      // duplicated cpuset already handled by docker itself
      const cpus = fs.readFileSync(cpusPath, 'utf8').trim().split(',');
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

    if (!fs.existsSync(periodPath)) {
      return docker_cpu_number;
    }

    if (!fs.existsSync(quotaPath)) {
      return docker_cpu_number;
    }

    const quota = parseInt(fs.readFileSync(quotaPath, 'utf8').trim(), 10);
    if (quota === -1) {
      return docker_cpu_number;
    }

    const period = parseInt(fs.readFileSync(periodPath, 'utf8').trim(), 10);
    if (period <= 0) {
      return docker_cpu_number;
    }

    if (quota / period < docker_cpu_number) {
      docker_cpu_number = quota / period;
    }

    return docker_cpu_number;
  }

  getDockerTotalMemory() {
    const mem_limit_path = path.join(this.cgroupBaseDir, '/memory/memory.limit_in_bytes');
    const mem_soft_limit_path = path.join(this.cgroupBaseDir, '/memory/memory.soft_limit_in_bytes');

    if (!fs.existsSync(mem_limit_path) || !fs.existsSync(mem_soft_limit_path)) {
      // keep os.totalmem() if limit or soft_limit not exists
      return os.totalmem();
    }

    const limit = Number(fs.readFileSync(mem_limit_path, 'utf8').trim().split('\n'));
    const soft_limit = Number(fs.readFileSync(mem_soft_limit_path, 'utf8').trim().split('\n'));
    if ((limit > Number.MAX_SAFE_INTEGER || isNaN(limit)) &&
      (soft_limit > Number.MAX_SAFE_INTEGER || isNaN(soft_limit))) {
      // if > MAX_SAFE_INTEGER no limit
      // if no limit or NaN, ignore it
      return os.totalmem();
    }

    if (limit > Number.MAX_SAFE_INTEGER || isNaN(limit)) {
      return soft_limit;
    }

    if (soft_limit > Number.MAX_SAFE_INTEGER || isNaN(soft_limit)) {
      return limit;
    }

    return soft_limit < limit ? soft_limit : limit;
  }

  async getFreeMemory() {
    if (this.isDocker) {
      try {
        return await this.dockerFreeMemory();
      } catch (ex) {
        return await this.linuxFreeMemroy();
      }
    } else if (this.isLinux) {
      return await this.linuxFreeMemroy();
    } else {
      return os.freemem();
    }
  }

  async dockerFreeMemory() {
    const memUsedPath = path.join(this.cgroupBaseDir, '/memory/memory.usage_in_bytes');
    const data = await fsx.readFile(memUsedPath, 'utf8');
    const used = Number(data.trim());
    return this.totalMemory - used;
  }

  /*
    MemTotal:        7852888 kB
    MemFree:          635184 kB
    MemAvailable:    1877656 kB
    Buffers:          701844 kB
    Cached:          1307420 kB
    SwapCached:       232084 kB
  */
  async linuxFreeMemroy() {
    const isMemAvailable = os.type() === 'Linux' && os.release() >= '3.14';
    let free = 0;
    const data = await fsx.readFile('/proc/meminfo', 'utf8');
    const usage = data.trim().split('\n');
    usage.forEach(function (line) {
      const pair = line.split(':');

      if (isMemAvailable) {
        if (pair[0] === 'MemAvailable') {
          free = parseInt(pair[1], 10) * 1024;
        }
      } else {
        if (['MemFree', 'Buffers', 'Cached'].indexOf(pair[0]) >= 0) {
          free += parseInt(pair[1], 10) * 1024;
        }
      }
    });

    if (free) {
      return free;
    }
    return os.freemem();
  }

  async getLoadAvg() {
    if (!this.isLinux) {
      return os.loadavg();
    }

    const data = await fsx.readFile('/proc/loadavg', 'utf8');
    const load = data.trim();
    const reg = /(\d+.\d+)\s+(\d+.\d+)\s+(\d+.\d+)/;
    const loads = load.match(reg);
    if (loads) {
      return [Number(loads[1]), Number(loads[2]), Number(loads[3])];
    }

    return os.loadavg();
  }

  async getCpuUsage() {
    // check order is important, please don't check linux firstly
    if (this.isDocker) {
      return await this.dockerCpuUsage();
    } else if (this.isLinux) {
      return await this.linuxCpuUsage();
    }

    const cpus = os.cpus();
    let total = 0;
    let idle = 0;
    for (let i = 0; i < cpus.length; i++) {
      const time = cpus[i].times;
      total += time.user + time.nice + time.sys + time.idle;
      idle += time.idle;
    }

    const diffTotal = total - this.lastTotal;
    const diffIdle = idle - this.lastIdle;
    this.lastTotal = total;
    this.lastIdle = idle;
    return 1 - diffIdle / diffTotal;
  }

  async dockerCpuUsage() {
    const used = await this.getAllUsedCpuFromProc();
    const sys = Date.now();
    const diff_used = (used - this.lastUsed) * (1000 / this.CLK_TCK);
    const diff_sys = sys - this.lastSys;
    this.lastUsed = used;
    this.lastSys = sys;
    if (diff_sys === 0) {
      return 0;
    }
    return diff_used / diff_sys / this.cpuNumber;
  }

  async getAllUsedCpuFromProc() {
    const dir = '/proc';
    const files = await fsx.readdir(dir);

    if (files.length === 0) {
      // impossible
      return 0;
    }

    const processes = files
      .map(file => ispid(file) && path.join(dir, file, 'stat'))
      .filter(file => file);

    let total = 0;
    for (let i = 0; i < processes.length; i++) {
      const file = processes[i];
      // process exists when get processes, process exit when read stat
      try {
        await fsx.stat(file);
        const data = await fsx.readFile(file, 'utf8');
        if (data) {
          const pstat = data.trim().split(' ');
          const used = parseInt(pstat[13], 10) +
            parseInt(pstat[14], 10) +
            parseInt(pstat[15], 10) +
            parseInt(pstat[16], 10);
          total += used;
        }
      } catch (err) {
        // ignoroe
      }
    }

    return total;
  }

  /**
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
  async linuxCpuUsage() {
    const data = await fsx.readFile('/proc/stat', 'utf8');
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

        const diffTotal = total - this.lastTotal;
        const diffIdle = idle - this.lastIdle;
        this.lastTotal = total;
        this.lastIdle = idle;
        if (diffTotal === 0) {
          throw new Error('called too frequently');
        }
        return 1 - diffIdle / diffTotal;
      }
    }
    return 0;
  }


  async run() {
    const result = {
      type: 'system',
      metrics: {
        cpu_count: this.cpuNumber,
        uptime: os.uptime(),
        totalmem: this.totalMemory
      }
    };

    result.metrics.freemem = await this.getFreeMemory();
    const load = await this.getLoadAvg();
    result.metrics.load1 = load[0];
    result.metrics.load5 = load[1];
    result.metrics.load15 = load[2];
    result.metrics.cpu = await this.getCpuUsage();
    return result;
  }
}

module.exports = SystemJob;