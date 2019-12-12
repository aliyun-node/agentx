'use strict';

const { execSync } = require('child_process');

const argv = process.argv.slice(2);

const [pid] = argv;

if (!pid) {
  console.log('Please pass <pid>');
  console.log('Usage:');
  console.log('  get_process_env <pid>');
  process.exit(1);
}

if (require('os').type() !== 'Linux') {
  console.log('Not support non-linux');
  process.exit(1);
}

function getAlinodeVersion(pid) {
  const output = execSync(`ls -l /proc/${pid}/exe`, {
    encoding: 'utf8'
  });
  // get execPath from PID
  // $ ls -l /proc/10532/exe
  // lrwxrwxrwx 1 puling.tyq users 0 Mar  8 16:54 /proc/10532/exe -> /home/puling.tyq/.tnvm/versions/node/v8.6.0/bin/node
  let [, execPath] = output.split('->');
  execPath = execPath.trim();
  if (!execPath.endsWith('bin/node')) {
    return '';
  }

  const versionOutput = execSync(`${execPath} -p "process.alinode"`, {
    encoding: 'utf8'
  });

  return versionOutput.trim();
}

function getProcessEnv(pid) {
  const output = execSync(`cat /proc/${pid}/environ`, {
    encoding: 'utf8'
  });
  const lines = output.split('\u0000');

  var env = {ENABLE_NODE_LOG: '', NODE_LOG_DIR: '/tmp'};
  var pm2_env = {};

  for (var i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('ENABLE_NODE_LOG')) {
      env.ENABLE_NODE_LOG = line.split('=')[1];
    }

    if (line.startsWith('NODE_LOG_DIR')) {
      env.NODE_LOG_DIR = line.split('=')[1];
    }

    if (line.startsWith('pm2_env=')) {
      try {
        pm2_env = JSON.parse(line.substr('pm2_env='.length));
      } catch (e) {
      }
    }
  }

  env.NODE_LOG_DIR = env.NODE_LOG_DIR || pm2_env.NODE_LOG_DIR;
  env.ENABLE_NODE_LOG = env.ENABLE_NODE_LOG || pm2_env.ENABLE_NODE_LOG;

  if (!env.NODE_LOG_DIR.endsWith('/')) {
    env.NODE_LOG_DIR += '/';
  }

  return env;
}

var env = getProcessEnv(pid);

const logdir = process.env.logdir;

var data = {
  alinode_version: getAlinodeVersion(pid),
  ENABLE_NODE_LOG: env.ENABLE_NODE_LOG,
  NODE_LOG_DIR: env.NODE_LOG_DIR,
  logdir: logdir
};

console.log(JSON.stringify(data));
