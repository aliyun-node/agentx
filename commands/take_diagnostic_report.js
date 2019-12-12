'use strict';

const utils = require('./utils');

async function diagReport() {
  const pid = process.argv[2];
  const res = await utils.takeDumpAction('diag_report', pid);
  if (res.ok) {
    console.log(`diagnostic-report文件路径:${res.data.filepath}`);
  } else {
    console.error(res.message);
  }
}

diagReport();
