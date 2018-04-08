AgentX
===========

AgentX是alinode团队开发的agent命令程序，用于协助alinode的性能数据上报和问题诊断。

- [![Build Status](https://travis-ci.org/aliyun-node/agentx.png?branch=master)](https://travis-ci.org/aliyun-node/agentx)
- [![Dependencies Status](https://david-dm.org/aliyun-node/agentx.png)](https://david-dm.org/aliyun-node/agentx)
- [![codecov](https://codecov.io/gh/aliyun-node/agentx/branch/master/graph/badge.svg)](https://codecov.io/gh/aliyun-node/agentx)

## Installation

```
$ npm install agentx -g
```
以上命令会将agentx安装为一个全局的命令行工具。

## Usage
agentx需要一个配置文件来进行使用，agentx仅会在配置指定下的目录执行命令或读取日志。

该配置格式如下：

```
{
  "server": "<SERVER IP>:8080",
  "appid": "<YOUR APPID>",
  "secret": "<YOUR SECRET>",
  "cmddir": "</path/to/your/command/dir>",
  "logdir": "</path/to/your/log/dir>",
  "reconnectDelay": 10,
  "heartbeatInterval": 60,
  "reportInterval": 60,
  "error_log": [
    "</path/to/your/error.log>",
    "您的应用在业务层面产生的异常日志的路径",
    "例如：/root/.logs/error.#YYYY#-#MM#-#DD#-#HH#.log",
    "可选"
  ],
  "packages": [
    "</path/to/your/package.json>",
    "可以输入多个package.json的路径",
    "可选"
  ]
}
```

> 配置中的#YYYY#、#MM#、#DD#、#HH#是通配符，如果您的异常日志是按时间生成的，请使用它。

保存为`config.json`。上述不明确的地方请咨询旺旺群：1406236180。

完成配置后，请使用以下命令进行执行：

```
$ nohup agentx config.json &
```

agentx将以常驻进程的方式执行。部署完成后，请访问<http://alinode.aliyun.com/dashboard>查看您的应用详情。如果一切正常，稍等片刻（1分钟）即可收到你的应用性能数据。

## License
The agentx is released under the MIT license.
