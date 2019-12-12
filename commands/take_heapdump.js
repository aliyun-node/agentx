'use strict';

const utils = require('./utils');

async function heapdump() {
  const pid = process.argv[2];
  const res = await utils.takeDumpAction('heapdump', pid);
  if (res.ok) {
    console.log(`heapdump文件路径:${res.data.filepath}`);
  } else {
    console.error(res.message);
  }
}

heapdump();