'use strict';

const fs = require('fs');
const net = require('net');
const path = require('path');

const unixServer = net.createServer(() => { });

const alinodeSocketPath = path.join(__dirname, `../logdir/alinode-uds-path-${process.pid}`);
if (fs.existsSync(alinodeSocketPath)) {
  fs.unlinkSync(alinodeSocketPath);
}
unixServer.listen(alinodeSocketPath);

const args = process.argv.slice(2);

const now = Date.now();

while (Date.now() - now < 50) {
  now;
}

if (!args.length || !args[1]) {
  process.exit(0);
}