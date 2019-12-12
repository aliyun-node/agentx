'use strict';

// ./uploader server filepath token id
var fs = require('fs');
var os = require('os');
var crypto = require('crypto');
var urllib = require('urllib');
var formstream = require('formstream');
var tunnel = require('tunnel-agent');

var argv = process.argv.slice(2);

var server = argv[0];
var filepath = argv[1];
var token = argv[2];
var id = argv[3];
var type = argv[4];

// check args
if (!server || !filepath || !token || !id) {
  console.log('参数错误');
  console.log('\t usage: ./uploader server filepath token id');
  process.exit(1);
}

// check filepath
fs.stat(filepath, function (err, stat) {
  if (err) {
    console.log('文件不存在');
    console.log(err.message);
    process.exit(1);
    return;
  }

  if (stat.size <= 0) {
    console.log('空文件');
    process.exit(1);
    return;
  }

  var form = formstream();
  form.file('file', filepath, filepath, stat.size);

  var nonce = '' + parseInt((Math.random() * 100000000000), 10);
  // get signature
  var shasum = crypto.createHash('sha1');
  shasum.update([process.env.agentid || os.hostname(), token, nonce, id].join(''));
  var sign = shasum.digest('hex');

  var url = 'http://' + server + '/files/' + id + '?nonce=' + nonce + '&sign=' + sign + '&type=' + type;

  var gateway = process.env.GATEWAY;
  if (gateway) {
    // upload to gateway
    url = 'http://' + gateway + '/file?target=' + encodeURIComponent(url);
  }

  var agent = false;
  if (process.env.http_proxy) {
    var parts = process.env.http_proxy.split(':');
    agent = tunnel.httpOverHttp({
      proxy: {
        host: parts[0],
        port: parts[1]
      }
    });
  }

  var opts = {
    dataType: 'json',
    type: 'POST',
    timeout: 60000 * 20, // 20分钟超时
    headers: form.headers(),
    stream: form,
    agent: agent
  };

  urllib.request(url, opts, function (err, data, res) {
    if (err) {
      throw err;
    }

    console.log(JSON.stringify(data));
    process.exit(0);
  });
});
