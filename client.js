#!/usr/bin/env node

'use strict';

var path = require('path');

var printUsage = function () {
  console.log('请指定配置文件, 用法:');
  console.log('  agent <config.json>');
};

var readConfig = function() {
  var argv = process.argv.slice(2);
  if (argv.length < 1) {
    printUsage();
    process.exit(1);
  }
  var confPath = path.resolve(argv[0]);

  var cfg = require(confPath);

  if (!cfg.appid ||
      !cfg.server ||
      !cfg.secret ||
      !cfg.heartbeatInterval ||
      !cfg.reconnectDelay) {
    console.log('配置文件:');
    console.log(JSON.stringify(cfg, null, 2));
    console.log("请检查配置文件, 确保以下参数配置：");
    console.log('  appid, server, secret, heartbeatInterval, reconnectDelay');
    process.exit(1);
  }

  return cfg;
};

var Agent = require('./lib/agent');
var agent = new Agent(readConfig());
agent.run();
