'use strict';

const os = require('os');
console.log(`${os.type()}/${os.hostname()}/${os.platform()}/${os.arch()}/${os.release()}`);