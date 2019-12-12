'use strict';

const os = require('os');
const cp = require('child_process');
const utils = require('../lib/utils');

const ignores = [
  'get_node_processes',
  'which node'
];

function getPidAndCmd(proc) {
  const result = {};
  let processRegexp;
  if (os.platform() === 'win32') {
    processRegexp = /^(.*) (\d+)$/;
  } else {
    processRegexp = /^(\d+) (.*)$/;
  }
  const parts = processRegexp.exec(proc.trim());
  if (parts) {
    if (os.platform() === 'win32') {
      result.pid = parts[2];
      result.command = parts[1];
    } else {
      result.pid = parts[1];
      result.command = parts[2];
    }
  }

  return result;
};

function isAlive(pid) {
  try {
    return process.kill(pid, 0);
  } catch (ex) {
    return false;
  }
};

function getNodeProcesses() {
  let cmd = '';

  if (os.platform() === 'win32') {
    cmd = 'wmic process get processid,commandline| findstr /C:"node.exe" /C:"pm2" /C:"iojs"';
  } else {
    cmd = 'ps -e -o pid,args | grep -E "node |iojs |PM2 " | grep -v grep';
  }

  let result = cp.execSync(cmd).toString();
  result = result
    .trim()
    .split('\n')
    .filter(line => ignores.every(ignore => typeof line === 'string' && !line.includes(ignore)))
    .map(line => {
      const result = getPidAndCmd(line);
      if (result.pid && result.command && isAlive(result.pid)) {
        return `${result.pid.trim()} ${result.command.trim()}`;
      }
    })
    .filter(item => item)
  return result;
}
exports.getNodeProcesses = getNodeProcesses;

console.log(getNodeProcesses().join('\n'));