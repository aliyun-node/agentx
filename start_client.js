#!/usr/bin/env node

'use strict';

var os = require('os');
var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var nounou = require('nounou');
var util = require('util');
var clientPath = path.join(__dirname, 'client.js');
var agentxStatusPath = path.join(os.homedir(), './.agentx.pid');


/* if running return true, else return false */
var is_running = function (pid) {
  try {
    return process.kill(pid, 0);
  } catch (err) {
    return false;
  }
}

var clearAgentxStatus = function () {
  fs.writeFileSync(agentxStatusPath, '');
};

var appendAgentxStatus = function (pid, config) {
  fs.appendFileSync(agentxStatusPath, [pid, config].join('\u0000') + '\n');
};

/* get from ~/.agentx.pid
   return [{pid: 123, config: '/path/to/config.json', running: true/false}, ]
*/
var getAgentxStatus = function () {
  if (fs.existsSync(agentxStatusPath)) {
    var pids = fs.readFileSync(agentxStatusPath, 'utf8').trim().split('\n')
    var running = [];
    for (var i = 0; i < pids.length; i++) {
      var pid = pids[i].split('\u0000');
      if (pid[i] === '') {
        continue;
      }
      var pid_info = {pid: pid[0], config: pid[1], running: false};
      if (pid_info.pid && is_running(pid_info.pid)) {
        pid_info.running = true;
      }
      running.push(pid_info);
    }
    return running;
  } else {
    return [];
  }
};



/* only kepp running agentx */
var updateAgentStatus = function (running) {
  clearAgentxStatus();
  for (var i = 0; i < running.length; i++) {
    if (running[i].running) {
      appendAgentxStatus(running[i].pid, running[i].config);
    }
  }
}


var argv = process.argv.slice(2);

var printUsage = function () {
  console.log('参数错误。用法示例:');
  console.log('  agentx <config.json>  start agentx with config.json');
  console.log('  agentx -v  --version  display agentx version');
  console.log('  agentx -h  --help     display this help and exit');
  console.log('  agentx --stop         kill all agentx started with nohup agentx config.json &');
  console.log('  agentx --reload       reload agentx with the same config path\n');
};

if (argv.length < 1) {
  printUsage();
  process.exit(1);
}

if (argv[0] === '-v' || argv[0] === '--version') {
  console.log(require('./package.json').version);
  process.exit(0);
}

if (argv[0] === '-h' || argv[0] === '--help') {
  printUsage();
  process.exit(0);
}

var agentxes = getAgentxStatus();

if (argv[0] === '--stop') {
  for (var i = 0; i < agentxes.length; i++) {
    var agentx = agentxes[i];
    if (agentx.running) {
      console.log('============ kill', agentx.pid);
      // process does not exists when kill operated
      try {
        process.kill(agentx.pid);
      } catch (e) {
      }
    }
  }

  // clear agent.pid file
  clearAgentxStatus();
  process.exit(0);
}

// reload last running agentx
if (argv[0] === '--reload') {
  for (var i = agentxes.length - 1; i >= 0; i--) {
    var agentx = agentxes[i];
    if (agentx.running) {
      argv[0] = agentx.config;
      console.log('.............kill', agentx.pid);
      try {
        process.kill(agentx.pid);
        spawn('./start_client.js', [agentx.config], {detached: true}, function(err, stdout, stderr) {
          console.log(err)
          console.log(stdout)
          console.log(stderr)
        });
        process.exit(1);
      } catch (e) {}
      break;
    }
  }
  console.log('there is no running agentx.')
  process.exit(0);
}

updateAgentStatus(agentxes);

appendAgentxStatus(process.pid, path.resolve(argv[0]));

if (!fs.existsSync(argv[0])) {
  console.log('\n', argv[0], 'is not a valid config file.\n');
  printUsage();
  process.exit(1);
}

nounou(clientPath, {
  args: [argv[0]],
  count: 1
})
.on('fork', function (client) {
  console.log('[%s] [client:%d] new client start', Date(), client.pid);
})
.on('disconnect', function (client) {
  console.error('[%s] [%s] client:%s disconnect, suicide: %s.',
    Date(), process.pid, client.pid, client.suicide);
})
.on('expectedExit', function (client, code, signal) {
  console.log('[%s] [%s], client %s died (code: %s, signal: %s)', Date(),
    process.pid, client.pid, code, signal);
})
.on('unexpectedExit', function (client, code, signal) {
  var err = new Error(util.format('client %s died (code: %s, signal: %s)',
    client.pid, code, signal));
  err.name = 'ClientDiedError';
  console.error('[%s] [%s] client exit: %s', Date(), process.pid, err.stack);
});
