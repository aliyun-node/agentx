#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const nounou = require('nounou');

const clientPath = path.join(__dirname, 'client.js');

const argv = process.argv.slice(2);

function printUsage() {
  console.log(`参数错误。用法示例:
  agentx <config.json>   start agentx with config.json
  agentx -v  --version   display agentx version
  agentx -h  --help      display this help and exit
`);
}

if (argv.length < 1) {
  printUsage();
  process.exit(1);
}

const input = argv[0];
if (input === '-v' || input === '--version') {
  console.log(require('./package.json').version);
  process.exit(0);
}

if (input === '-h' || input === '--help') {
  printUsage();
  process.exit(0);
}

if (!fs.existsSync(input)) {
  console.log(`
${input} is not a valid json file.
`);
  printUsage();
  process.exit(1);
}

const pid = process.pid;
nounou(clientPath, {
  args: [input],
  count: 1
}).on('fork', function (client) {
  console.log(`[${Date()}] [client:${client.pid}] new client start`);
}).on('disconnect', function (client) {
  console.error(`[${Date()}] [${pid}] client:${client.pid} disconnect, suicide: ${client.suicide}.`);
}).on('expectedExit', function (client, code, signal) {
  console.log(`[${Date()}] [${pid}], client ${client.pid} died (code: ${code}, signal: ${signal})`);
}).on('unexpectedExit', function (client, code, signal) {
  const message = `client ${client.pid} died (code: ${code}, signal: ${signal})`;
  const err = new Error(message);
  err.name = 'ClientDiedError';
  console.error(`[${Date()}] [${process.pid}] client exit: ${err.stack}`);
});
