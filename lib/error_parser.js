'use strict';

var Parser = function (limit) {
  this.list = [];
  this.current = null;
  this.pending = '';
  this.limit = limit || 0;
};

var parse = function (readable, limit, callback) {
  if (typeof limit === 'function') {
    callback = limit;
    limit = 0;
  }

  var parser = new Parser(limit);
  parser.parseStream(readable, callback);
};

Parser.prototype.expect = function (line, startWith) {
  return line.trim().indexOf(startWith) === 0;
};

Parser.prototype.execute = function (data) {
  this.pending += data;
  var index = this.pending.indexOf('\n');
  while (index !== -1) {
    var line = this.pending.slice(0, index);
    this.parse(line);
    this.pending = this.pending.slice(index + 1);
    index = this.pending.indexOf('\n');
  }
};

Parser.prototype.pushLog = function () {
  if (this.current) {
    this.list.push(this.current);
    if (this.limit > 0 && this.limit < this.list.length) {
      this.list.shift(); // 删掉前面的
    }
  }
  this.current = null;
};

Parser.prototype.parse = function (line) {
  if (line.match(/Error: /)) { // start
    this.pushLog();
    this.current = {stack: '', type: '', extra: ''};
    this.current.stack = line + '\n';
    var match = line.match(/([A-z]*Error): /);
    this.current.type = match && match[1] || '';
    // TODO: extract with REGEXP
    this.current.timestamp = new Date().getTime();
  } else if (this.expect(line, 'at ')) {
    if (this.current) {
      this.current.stack += this.current.extra + line + '\n';
      this.current.extra = '';
    }
  } else if (line === '') { // 空行
    this.pushLog(); // 保存最近解析到的log
  } else {
    if (this.current) {
      if (this.current.extra.length < 250) { // 最多存放250个字符
        this.current.extra += line + '\n'; // 不明确的数据，暂时存放
      }
    }
  }
};

Parser.prototype.parseStream = function (readable, callback) {
  var that = this;
  var cleanup;

  var onData = function (data) {
    that.execute(data);
  };

  var onEnd = function () {
    cleanup();
    // 如果最后不在堆栈中，丢弃剩余可能存在的额外数据
    // 保存最后解析到的这条日志
    if (that.current && that.current.extra) {
      that.pushLog();
    }
    callback(null, that.list);
  };

  var onError = function (err) {
    cleanup();
    callback(err);
  };

  cleanup = function () {
    readable.removeListener('data', onData);
    readable.removeListener('end', onEnd);
    readable.removeListener('error', onError);
  };

  readable.on('data', onData);
  readable.on('end', onEnd);
  readable.on('error', onError);
};

Parser.parse = parse;

module.exports = Parser;
