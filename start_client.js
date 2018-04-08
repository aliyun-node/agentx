#!/usr/bin/env node

'use strict';

var fs = require('fs');
var path = require('path');
var nounou = require('nounou');
var util = require('util');
var clientPath = path.join(__dirname, 'client.js');

var argv = process.argv.slice(2);

var printUsage = function () {
  console.log('参数错误。用法示例:');
  console.log('  agentx <config.json>   start agentx with config.json');
  console.log('  agentx -v  --version   display agentx version');
  console.log('  agentx -h  --help      display this help and exit\n');
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

if (!fs.existsSync(argv[0])) {
  console.log('\n', argv[0], 'is not a valid json file.\n');
  printUsage();
  process.exit(1);
}

nounou(clientPath, {
  args: [argv[0]],
  count: 1
}).on('fork', function (client) {
  console.log('[%s] [client:%d] new client start', Date(), client.pid);
}).on('disconnect', function (client) {
  console.error('[%s] [%s] client:%s disconnect, suicide: %s.',
    Date(), process.pid, client.pid, client.suicide);
}).on('expectedExit', function (client, code, signal) {
  console.log('[%s] [%s], client %s died (code: %s, signal: %s)', Date(),
    process.pid, client.pid, code, signal);
}).on('unexpectedExit', function (client, code, signal) {
  var err = new Error(util.format('client %s died (code: %s, signal: %s)',
    client.pid, code, signal));
  err.name = 'ClientDiedError';
  console.error('[%s] [%s] client exit: %s', Date(), process.pid, err.stack);
});
