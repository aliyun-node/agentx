#!/usr/bin/env node

'use strict';

var path = require('path');
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

var readConfig = function () {
  var confPath = path.resolve(argv[0]);
  var cfg = require(confPath);

  if (!cfg.server ||
    !cfg.appid ||
    !cfg.secret ||
    !cfg.cmddir ||
    !cfg.logdir ||
    !cfg.heartbeatInterval ||
    !cfg.reconnectDelay ||
    !cfg.reportInterval) {
    console.log('配置文件:');
    console.log(JSON.stringify(cfg, null, 2));
    console.log('请检查配置文件, 确保以下参数配置：');
    console.log('  server, appid, secret, cmddir, logdir, heartbeatInterval, reconnectDelay, reportInterval');
    process.exit(1);
  }

  return cfg;
};

if (argv[0] === '-v') {
  console.log(require('./package.json').version);
  process.exit(0);
}

process.on('uncaughtException', function (err) {
  console.log(new Date());
  console.log(err);
  process.exit(-1);
});

var Agent = require('./lib/agent');
var agent = new Agent(readConfig());
agent.run();
