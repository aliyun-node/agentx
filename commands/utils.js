'use strict';

const os = require('os');
const fs = require('fs');
const util = require('util');
const exists = util.promisify(fs.exists);
const readFile = util.promisify(fs.readFile);
const path = require('path');

const SPLITTER = '\u0000';

async function getXprofilerPath(pid) {
  const xprofilerPath = path.join(os.homedir(), '.xprofiler');
  if (!await exists(xprofilerPath)) {
    return false;
  }
  let xctlPath = '';
  const xprofilerContent = await readFile(xprofilerPath, 'utf8');
  for (const line of xprofilerContent.split('\n')) {
    const tmp = line.split(SPLITTER);
    if (Number(tmp[0]) === Number(pid)) {
      xctlPath = path.join(tmp[5], 'lib/xctl.js');
      if (!await exists(xctlPath)) {
        xctlPath = '';
      }
      break;
    } else {
      continue;
    }
  }
  return xctlPath;
}

async function takeDumpAction(action, pid, options = {}) {
  let res;
  const xctlPath = await getXprofilerPath(pid);
  if (!xctlPath) {
    res = { ok: false, message: 'get xprofiler path failed.' };
  } else {
    const xctl = require(xctlPath);
    res = xctl(pid, action, options);
  }

  return res;
}

exports.takeDumpAction = takeDumpAction;