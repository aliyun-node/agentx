'use strict';

const utils = require('./utils');

async function diagReport() {
  const pid = process.argv[2];
  const res = await utils.takeDumpAction('start_heap_profiling', pid, { profiling_time: 180 * 1000 });
  if (res.ok) {
    console.log(`heapprofile文件路径:${res.data.filepath}`);
  } else {
    console.error(res.message);
  }
}

diagReport();
