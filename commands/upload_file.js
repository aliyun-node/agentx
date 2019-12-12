// # #!/bin/sh

// # export ENABLE_NODE_LOG=NO

// # DIR=$(cd "$(dirname "$0")"; pwd)
// # GET_NODE_EXE=$DIR/get_node_exe
// # NODE_EXE=`$GET_NODE_EXE`

// # FULL_PATH=$2
// # TARGET_PATH=$2

// # filesize=`ls -l $FULL_PATH|awk '{print $5}'`

// # if [ "$filesize" = 0 ]; then
// #   echo '空文件'
// #   exit 1
// # fi

// # GZIP=`which gzip`

// # if [ $GZIP ] && [ -f "$FULL_PATH" ]; then
// #   $GZIP -c $FULL_PATH > $FULL_PATH".gz"
// #   TARGET_PATH=$FULL_PATH".gz"
// # fi

// # UPLOADER=$DIR/uploader.js

// # #uploader server filepath token id
// # $NODE_EXE "$UPLOADER" $1 $TARGET_PATH $3 $4 $5

'use strict';

const fs = require('fs');
const cp = require('child_process');
const util = require('util');
const zlib = require('zlib');
const path = require('path');
const exists = util.promisify(fs.exists);
const args = process.argv.slice(2);
const gzip = zlib.createGzip();

async function upload() {
  const filepath = args[1];
  if (!await exists(filepath)) {
    console.error(`文件 ${filepath} 不存在.`);
    return;
  }

  // gzip
  const gzipFile = path.join(path.dirname(filepath), `${path.basename(filepath)}.gz`);
  const gzipFileStream = fs.createWriteStream(gzipFile);
  fs.createReadStream(filepath)
    .pipe(gzip)
    .on('error', err => console.error(`压缩文件 ${filepath} 失败: ${err}`))
    .pipe(gzipFileStream)
    .on('error', err => console.error(`压缩文件 ${filepath} 失败: ${err}`))
    .on('finish', () => {
      const opts = { cwd: __dirname, env: process.env, stdio: 'inherit' };
      args.unshift('uploader.js');
      args[2] = gzipFile;
      cp.spawn('node', args, opts);
    });
}

upload();
