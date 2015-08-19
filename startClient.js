#!/usr/bin/env node

'use strict';

var path = require('path');
var cfork = require('cfork');
var util = require('util');
var clientPath = path.join(__dirname, 'client.js');

var getConfigPath = function () {
  var argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.log('请指定配置文件, 用法:');
    console.log('  agentx <config.json>');
    process.exit(1);
  }
  return path.resolve(argv[0]);
};

cfork({
  exec: clientPath,
  args: [getConfigPath()],
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
