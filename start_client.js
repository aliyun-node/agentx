#!/usr/bin/env node

'use strict';

var path = require('path');
var cfork = require('cfork');
var util = require('util');
var clientPath = path.join(__dirname, 'client.js');

var argv = process.argv.slice(2);

var printUsage = function () {
  console.log('参数错误。用法示例:');
  console.log('  agentx <config.json>');
  console.log('  agentx -v');
};

if (argv.length < 1) {
  printUsage();
  process.exit(1);
}

if (argv[0] === '-v') {
  console.log(require('./package.json').version);
  process.exit(0);
}

cfork({
  exec: clientPath,
  args: [argv[0]],
  count: 1
})
.on('fork', function (client) {
  console.log('[%s] [client:%d] new client start', Date(), client.process.pid);
})
.on('disconnect', function (client) {
  console.error('[%s] [daemon:%s] client:%s disconnect, suicide: %s, state: %s.',
    Date(), process.pid, client.process.pid, client.suicide, client.state);
})
.on('exit', function (client, code, signal) {
  var exitCode = client.process.exitCode;
  var err = new Error(util.format('client %s died (code: %s, signal: %s, suicide: %s, state: %s)',
    client.process.pid, exitCode, signal, client.suicide, client.state));
  err.name = 'ClientDiedError';
  console.error('[%s] [daemon:%s] client exit: %s', Date(), process.pid, err.stack);
});
