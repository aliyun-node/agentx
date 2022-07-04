'use strict';
const path = require('path');
const expect = require('expect.js');
const system = require('../../lib/orders/system');
const mm = require('mm');


const mock_cpu = [
  'cpu  5313978 56110 1292246 14983316 177088 0 12355 0 0 0',
  'cpu0 1379306 9009 329765 10306868 111389 0 3383 0 0 0',
  'cpu1 1285064 8472 313706 1578339 12760 0 1208 0 0 0',
  'cpu2 1350005 9930 355196 1544412 13443 0 4575 0 0 0',
  'cpu3 1299601 28697 293578 1553694 39495 0 3187 0 0 0',
  'intr 139191038 10 116186 0 0 0 0 0 0 1 25708 0 0 1640341 0 0 0 0 0 0 0 0 0 0 254 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 181199 1705141 102 0 6657744 20 5961153 127 9709 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0',
  'ctxt 481278166',
  'btime 1537152546',
  'processes 163808',
  'procs_running 1',
  'procs_blocked 0',
  'softirq 85487288 262 30666935 631 125824 1524483 15 143418 29334126 0 23691594'
].join('\n');

const mock_cpu_1 = [
  'cpu  5313978 56110 1292246 14983316 177088 0 12355 0 0',
  'cpu0 1379306 9009 329765 10306868 111389 0 3383 0 0 0',
  'cpu1 1285064 8472 313706 1578339 12760 0 1208 0 0 0',
  'cpu2 1350005 9930 355196 1544412 13443 0 4575 0 0 0',
  'cpu3 1299601 28697 293578 1553694 39495 0 3187 0 0 0',
  'intr 139191038 10 116186 0 0 0 0 0 0 1 25708 0 0 1640341 0 0 0 0 0 0 0 0 0 0 254 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 181199 1705141 102 0 6657744 20 5961153 127 9709 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0',
  'ctxt 481278166',
  'btime 1537152546',
  'processes 163808',
  'procs_running 1',
  'procs_blocked 0',
  'softirq 85487288 262 30666935 631 125824 1524483 15 143418 29334126 0 23691594'
].join('\n');

const mock_cpu_2 = [
  'cpu  5313978 56110 1292246 14983316 177088 0 12355 0',
  'cpu0 1379306 9009 329765 10306868 111389 0 3383 0 0 0',
  'cpu1 1285064 8472 313706 1578339 12760 0 1208 0 0 0',
  'cpu2 1350005 9930 355196 1544412 13443 0 4575 0 0 0',
  'cpu3 1299601 28697 293578 1553694 39495 0 3187 0 0 0',
  'intr 139191038 10 116186 0 0 0 0 0 0 1 25708 0 0 1640341 0 0 0 0 0 0 0 0 0 0 254 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 181199 1705141 102 0 6657744 20 5961153 127 9709 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0',
  'ctxt 481278166',
  'btime 1537152546',
  'processes 163808',
  'procs_running 1',
  'procs_blocked 0',
  'softirq 85487288 262 30666935 631 125824 1524483 15 143418 29334126 0 23691594'
].join('\n');

const mock_cpu_3 = [
  'cpu  5313978 56110 1292246 14983316 177088 0 12355',
  'cpu0 1379306 9009 329765 10306868 111389 0 3383 0 0 0',
  'cpu1 1285064 8472 313706 1578339 12760 0 1208 0 0 0',
  'cpu2 1350005 9930 355196 1544412 13443 0 4575 0 0 0',
  'cpu3 1299601 28697 293578 1553694 39495 0 3187 0 0 0',
  'intr 139191038 10 116186 0 0 0 0 0 0 1 25708 0 0 1640341 0 0 0 0 0 0 0 0 0 0 254 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 181199 1705141 102 0 6657744 20 5961153 127 9709 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0',
  'ctxt 481278166',
  'btime 1537152546',
  'processes 163808',
  'procs_running 1',
  'procs_blocked 0',
  'softirq 85487288 262 30666935 631 125824 1524483 15 143418 29334126 0 23691594'
].join('\n');


const mock_mem = [
  'MemTotal:        7852888 kB',
  'MemFree:          635184 kB',
  'MemAvailable:    1877656 kB',
  'Buffers:          701844 kB',
  'Cached:          1307420 kB',
  'SwapCached:       232084 kB',
  'Active:          5392132 kB',
  'Inactive:        1387364 kB',
  'Active(anon):    4606812 kB',
  'Inactive(anon):   774872 kB',
  'Active(file):     785320 kB',
  'Inactive(file):   612492 kB',
  'Unevictable:        1448 kB',
  'DirectMap2M:     7340032 kB',
  'DirectMap1G:     1048576 kB'].join('\n');

const mock_load = '0.51 0.36 0.50 2/1253 58';


describe('/lib/orders/system', function () {

  describe('mock docker cgroup', function () {
    const mock = [ '11:pids:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '10:freezer:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '9:net_prio,net_cls:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '8:blkio:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '7:memory:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '6:devices:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '5:cpuacct,cpu:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '4:hugetlb:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '3:perf_event:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '2:cpuset:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '1:name=systemd:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope' ].join('\n');

    before(function() {
      mm.syncData(require('fs'), 'readFileSync', mock);
    });

    it('should ok', function() {
      system.init();
      expect(system.isDocker).equal(true);
    });

    after(function() {
      mm.restore();
    });
  });


  describe('mock docker isDocker true', function () {
    const mock = [ '12:pids:/init.scope',
      '11:hugetlb:/',
      '10:freezer:/',
      '9:devices:/init.scope',
      '8:perf_event:/',
      '7:net_cls,net_prio:/',
      '6:memory:/init.scope',
      '5:rdma:/',
      '4:blkio:/init.scope',
      '3:cpu,cpuacct:/init.scope',
      '2:cpuset:/',
      '1:name=systemd:/init.scope'].join('\n');

    before(function() {
      mm.syncData(require('fs'), 'readFileSync', mock);
      mm.syncData(require('fs'), 'existsSync', true);
    });

    it('should ok', function(done) {
      system.init({isDocker: true});
      expect(system.isDocker).equal(true);
      done();
    });

    after(function() {
      mm.restore();
    });
  });

  describe('mock docker no cgroup no dockerenv isDocker true', function () {
    const mock = [ '12:pids:/init.scope',
      '11:hugetlb:/',
      '10:freezer:/',
      '9:devices:/init.scope',
      '8:perf_event:/',
      '7:net_cls,net_prio:/',
      '6:memory:/init.scope',
      '5:rdma:/',
      '4:blkio:/init.scope',
      '3:cpu,cpuacct:/init.scope',
      '2:cpuset:/',
      '1:name=systemd:/init.scope'].join('\n');

    before(function() {
      mm.syncData(require('fs'), 'readFileSync', mock);
      mm.syncData(require('fs'), 'existsSync', false);
    });

    it('should ok', function(done) {
      system.init({isDocker: true});
      expect(system.isDocker).equal(true);
      done();
    });

    after(function() {
      mm.restore();
    });
  });

  describe('mock docker no cgroup no dockerenv isDocker string', function () {
    const mock = [ '12:pids:/init.scope',
      '11:hugetlb:/',
      '10:freezer:/',
      '9:devices:/init.scope',
      '8:perf_event:/',
      '7:net_cls,net_prio:/',
      '6:memory:/init.scope',
      '5:rdma:/',
      '4:blkio:/init.scope',
      '3:cpu,cpuacct:/init.scope',
      '2:cpuset:/',
      '1:name=systemd:/init.scope'].join('\n');

    before(function() {
      mm.syncData(require('fs'), 'readFileSync', mock);
      mm.syncData(require('fs'), 'existsSync', false);
    });

    it('should ok', function(done) {
      system.init({isDocker: 'exists'});
      expect(system.isDocker).equal(true);
      done();
    });

    after(function() {
      mm.restore();
    });
  });



  describe('mock docker isDocker false', function () {
    const mock = [ '12:pids:/init.scope',
      '11:hugetlb:/',
      '10:freezer:/',
      '9:devices:/init.scope',
      '8:perf_event:/',
      '7:net_cls,net_prio:/',
      '6:memory:/init.scope',
      '5:rdma:/',
      '4:blkio:/init.scope',
      '3:cpu,cpuacct:/init.scope',
      '2:cpuset:/',
      '1:name=systemd:/init.scope'].join('\n');

    before(function() {
      mm.syncData(require('fs'), 'readFileSync', mock);
      mm.syncData(require('fs'), 'existsSync', true);
    });

    it('should ok', function(done) {
      system.init({isDocker: false});
      expect(system.isDocker).equal(false);
      done();
    });

    after(function() {
      mm.restore();
    });
  });


  describe('mock docker dockerenv', function () {
    const mock = [ '12:pids:/init.scope',
      '11:hugetlb:/',
      '10:freezer:/',
      '9:devices:/init.scope',
      '8:perf_event:/',
      '7:net_cls,net_prio:/',
      '6:memory:/init.scope',
      '5:rdma:/',
      '4:blkio:/init.scope',
      '3:cpu,cpuacct:/init.scope',
      '2:cpuset:/',
      '1:name=systemd:/init.scope'].join('\n');

    before(function() {
      mm.syncData(require('fs'), 'readFileSync', mock);
      mm.syncData(require('fs'), 'existsSync', true);
    });

    it('should ok', function(done) {
      system.init();
      expect(system.isDocker).equal(true);
      done();
    });

    after(function() {
      mm.restore();
    });
  });

  describe('mock docker no cgroup no dockerenv', function () {
    const mock = [ '12:pids:/init.scope',
      '11:hugetlb:/',
      '10:freezer:/',
      '9:devices:/init.scope',
      '8:perf_event:/',
      '7:net_cls,net_prio:/',
      '6:memory:/init.scope',
      '5:rdma:/',
      '4:blkio:/init.scope',
      '3:cpu,cpuacct:/init.scope',
      '2:cpuset:/',
      '1:name=systemd:/init.scope'].join('\n');

    before(function() {
      mm.syncData(require('fs'), 'readFileSync', mock);
      mm.syncData(require('fs'), 'existsSync', false);
    });

    it('should ok', function(done) {
      system.init();
      expect(system.isDocker).equal(false);
      done();
    });

    after(function() {
      mm.restore();
    });
  });

  describe('mock docker error', function () {
    before(function() {
      mm.syncData(require('fs'), 'readFileSync', 8888);
      mm.syncData(require('fs'), 'existsSync', false);
    });

    it('should ok', function(done) {
      system.init();
      expect(system.isDocker).equal(false);
      done();
    });

    after(function() {
      mm.restore();
    });
  });

  describe('mock docker error no period', function () {
    const mock_readfile = [ '11:pids:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '10:freezer:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '9:net_prio,net_cls:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '8:blkio:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '7:memory:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '6:devices:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '5:cpuacct,cpu:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '4:hugetlb:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '3:perf_event:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '2:cpuset:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '1:name=systemd:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope' ].join('\n');

    const mock = function(f) {
      const period_path = '/sys/fs/cgroup/cpu/cpu.cfs_period_us';
      const quota_path = '/sys/fs/cgroup/cpu/cpu.cfs_quota_us';
      const cpus_path = '/sys/fs/cgroup/cpuset/cpuset.cpus';
      const dockerenv_path = '/.dockerenv';
      const self_cgroup_path = '/proc/self/cgroup';
      if (f === period_path) {
        return false;
      }
      if (f === quota_path) {
        return true;
      }
      if (f === cpus_path) {
        return true;
      }
      if (f === dockerenv_path) {
        return false;
      }
      if (f === self_cgroup_path) {
        return true;
      }
    };

    before(function() {
      mm.syncData(require('fs'), 'readFileSync', mock_readfile);
      mm(require('fs'), 'existsSync', mock);
    });

    it('should ok', function(done) {
      system.init();
      expect(system.isDocker).equal(true);
      done();
    });

    after(function() {
      mm.restore();
    });
  });


  describe('mock docker error no quota', function () {
    const mock_readfile = [ '11:pids:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '10:freezer:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '9:net_prio,net_cls:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '8:blkio:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '7:memory:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '6:devices:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '5:cpuacct,cpu:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '4:hugetlb:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '3:perf_event:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '2:cpuset:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope',
      '1:name=systemd:/system.slice/docker-03592bf11fc8b122fa6f5a4f433ff23adea7b855b3d2c944267833b8cd9b0608.scope' ].join('\n');

    const mock = function(f) {
      const period_path = '/sys/fs/cgroup/cpu/cpu.cfs_period_us';
      const quota_path = '/sys/fs/cgroup/cpu/cpu.cfs_quota_us';
      const cpus_path = '/sys/fs/cgroup/cpuset/cpuset.cpus';
      const dockerenv_path = '/.dockerenv';
      const self_cgroup_path = '/proc/self/cgroup';
      if (f === period_path) {
        return true;
      }
      if (f === quota_path) {
        return false;
      }
      if (f === cpus_path) {
        return true;
      }
      if (f === dockerenv_path) {
        return false;
      }
      if (f === self_cgroup_path) {
        return true;
      }
    };

    before(function() {
      mm.syncData(require('fs'), 'readFileSync', mock_readfile);
      mm(require('fs'), 'existsSync', mock);
    });

    it('should ok', function(done) {
      system.init();
      expect(system.isDocker).equal(true);
      done();
    });

    after(function() {
      mm.restore();
    });
  });

  describe('mock docker cpus 0.5', function () {
    const period_path = '/sys/fs/cgroup/cpu/cpu.cfs_period_us';
    const quota_path = '/sys/fs/cgroup/cpu/cpu.cfs_quota_us';
    const cpus_path = '/sys/fs/cgroup/cpuset/cpuset.cpus';

    const mock = function(x) {
      if (x === quota_path) {
        return '5000';
      }
      if (x === period_path) {
        return '10000';
      }
      if (x === cpus_path) {
        return '1-2, 4';
      }
      return '::';
    };

    before(function() {
      mm(require('fs'), 'readFileSync', mock);
      mm.syncData(require('fs'), 'existsSync', true);
    });

    it('should ok', function(done) {
      system.init();
      expect(system.isDocker).equal(true);
      expect(system.cpuNumber).equal(0.5);
      done();
    });

    after(function() {
      mm.restore();
    });
  });

  describe('mock docker cpus 1.5', function () {
    const period_path = '/sys/fs/cgroup/cpu/cpu.cfs_period_us';
    const quota_path = '/sys/fs/cgroup/cpu/cpu.cfs_quota_us';
    const cpus_path = '/sys/fs/cgroup/cpuset/cpuset.cpus';

    const mock = function(x) {
      if (x === quota_path) {
        return '15000';
      }
      if (x === period_path) {
        return '10000';
      }
      if (x === cpus_path) {
        return '1-2, 4';
      }
      return '::';
    };

    before(function() {
      mm(require('fs'), 'readFileSync', mock);
      mm.syncData(require('fs'), 'existsSync', true);
    });

    it('should ok', function(done) {
      system.init();
      expect(system.isDocker).equal(true);
      expect(system.cpuNumber).equal(1.5);
      system.run(function(err, params) {
        done();
      });
    });

    after(function() {
      mm.restore();
    });
  });

  describe('mock docker cpus 3', function () {
    const period_path = '/sys/fs/cgroup/cpu/cpu.cfs_period_us';
    const quota_path = '/sys/fs/cgroup/cpu/cpu.cfs_quota_us';
    const cpus_path = '/sys/fs/cgroup/cpuset/cpuset.cpus';

    const mock = function(x) {
      if (x === quota_path) {
        return '85000';
      }
      if (x === period_path) {
        return '10000';
      }
      if (x === cpus_path) {
        return '1-2, 4';
      }
      return '::';
    };

    before(function() {
      mm(require('fs'), 'readFileSync', mock);
      mm.syncData(require('os'), 'cpus', ['cpu0', 'cpu1', 'cpu2', 'cpu3']);
      mm.syncData(require('fs'), 'existsSync', true);
    });

    it('should ok', function(done) {
      system.init();
      expect(system.isDocker).equal(true);
      expect(system.cpuNumber).equal(3);
      done();
    });

    after(function() {
      mm.restore();
    });
  });

  describe('mock docker cpus quota -1', function () {
    const period_path = '/sys/fs/cgroup/cpu/cpu.cfs_period_us';
    const quota_path = '/sys/fs/cgroup/cpu/cpu.cfs_quota_us';
    const cpus_path = '/sys/fs/cgroup/cpuset/cpuset.cpus';

    const mock = function(x) {
      if (x === quota_path) {
        return '-1';
      }
      if (x === period_path) {
        return '10000';
      }
      if (x === cpus_path) {
        return '1-2, 4';
      }
      return '::';
    };

    before(function() {
      mm(require('fs'), 'readFileSync', mock);
      mm.syncData(require('fs'), 'existsSync', true);
      mm.syncData(require('os'), 'cpus', ['cpu0', 'cpu1', 'cpu2', 'cpu3']);
    });

    it('should ok', function(done) {
      system.init();
      expect(system.isDocker).equal(true);
      expect(system.cpuNumber).equal(3);
      done();
    });

    after(function() {
      mm.restore();
    });
  });


  describe('mock docker cpus period -1', function () {
    const period_path = '/sys/fs/cgroup/cpu/cpu.cfs_period_us';
    const quota_path = '/sys/fs/cgroup/cpu/cpu.cfs_quota_us';
    const cpus_path = '/sys/fs/cgroup/cpuset/cpuset.cpus';

    const mock = function(x) {
      if (x === quota_path) {
        return '40000';
      }
      if (x === period_path) {
        return '-1';
      }
      if (x === cpus_path) {
        return '1-2, 4';
      }
      return '::';
    };

    before(function() {
      mm(require('fs'), 'readFileSync', mock);
      mm.syncData(require('fs'), 'existsSync', true);
      mm.syncData(require('os'), 'cpus', ['cpu0', 'cpu1', 'cpu2', 'cpu3']);
    });

    it('should ok', function(done) {
      system.init();
      expect(system.isDocker).equal(true);
      expect(system.cpuNumber).equal(3);
      done();
    });

    after(function() {
      mm.restore();
    });
  });


  describe('mock docker memory 0.5', function () {
    const cgroupBaseDir = '/sys/fs/cgroup';
    const mem_limit_path =  path.join(cgroupBaseDir, '/memory/memory.limit_in_bytes');
    const mem_soft_limit_path = path.join(cgroupBaseDir, '/memory/memory.soft_limit_in_bytes');
    const mem_used_path = path.join(cgroupBaseDir, '/memory/memory.usage_in_bytes');

    const period_path = '/sys/fs/cgroup/cpu/cpu.cfs_period_us';
    const quota_path = '/sys/fs/cgroup/cpu/cpu.cfs_quota_us';
    const cpus_path = '/sys/fs/cgroup/cpuset/cpuset.cpus';


    const mock = function(x) {
      if (x === quota_path) {
        return '15000';
      }
      if (x === period_path) {
        return '10000';
      }
      if (x === cpus_path) {
        return '1-2, 4';
      }
      if (x === mem_limit_path) {
        return (1024 * 1024 * 100).toString();
      }
      if (x === mem_soft_limit_path) {
        return (1024 * 1024 * 96).toString();
      }
      return '::';
    };

    const mockmem = function(f, options,cb) {
      if (f === '/proc/stat') {
        return cb(null, mock_cpu);
      }
      if (f === '/proc/loadavg') {
        return cb(null, mock_load);
      } if (f === '/proc/meminfo') {
        return cb(null, mock_mem);
      }

      if (f === mem_used_path) {
        return cb(null, (1024 * 1024 * 48).toString());
      }
      return cb(null, '');
    };


    before(function() {
      mm(require('fs'), 'readFile', mockmem);
      mm(require('fs'), 'readFileSync', mock);
      mm.syncData(require('fs'), 'existsSync', true);
    });

    it('should ok', function(done) {
      system.init();
      expect(system.isDocker).equal(true);
      expect(system.cpuNumber).equal(1.5);
      system.run(function(err, params) {
        expect(params.metrics.totalmem).equal(1024 * 1024 * 96);
        expect(params.metrics.freemem).equal(1024 * 1024 * (96 - 48));
        expect(params.metrics.freemem / params.metrics.totalmem).equal(0.5);
        done();
      });
    });

    after(function() {
      mm.restore();
    });
  });


  describe('mock docker memory 0.52', function () {
    const cgroupBaseDir = '/sys/fs/cgroup';
    const mem_limit_path =  path.join(cgroupBaseDir, '/memory/memory.limit_in_bytes');
    const mem_soft_limit_path = path.join(cgroupBaseDir, '/memory/memory.soft_limit_in_bytes');
    const mem_used_path = path.join(cgroupBaseDir, '/memory/memory.usage_in_bytes');

    const period_path = '/sys/fs/cgroup/cpu/cpu.cfs_period_us';
    const quota_path = '/sys/fs/cgroup/cpu/cpu.cfs_quota_us';
    const cpus_path = '/sys/fs/cgroup/cpuset/cpuset.cpus';


    const mock = function(x) {
      if (x === quota_path) {
        return '15000';
      }
      if (x === period_path) {
        return '10000';
      }
      if (x === cpus_path) {
        return '1-2, 4';
      }
      if (x === mem_limit_path) {
        return (1024 * 1024 * 100).toString();
      }
      if (x === mem_soft_limit_path) {
        return (1024 * 1024 * 100).toString();
      }
      return '::';
    };

    const mockmem = function(f, options,cb) {
      if (f === '/proc/stat') {
        return cb(null, mock_cpu);
      }
      if (f === '/proc/loadavg') {
        return cb(null, mock_load);
      } if (f === '/proc/meminfo') {
        return cb(null, mock_mem);
      }

      if (f === mem_used_path) {
        return cb(null, (1024 * 1024 * 48).toString());
      }
      return cb(null, '');
    };


    before(function() {
      mm(require('fs'), 'readFile', mockmem);
      mm(require('fs'), 'readFileSync', mock);
      mm.syncData(require('fs'), 'existsSync', true);
    });

    it('should ok', function(done) {
      system.init();
      expect(system.isDocker).equal(true);
      expect(system.cpuNumber).equal(1.5);
      system.run(function(err, params) {
        expect(params.metrics.totalmem).equal(1024 * 1024 * 100);
        expect(params.metrics.freemem).equal(1024 * 1024 * (100 - 48));
        expect(params.metrics.freemem / params.metrics.totalmem).equal(0.52);
        done();
      });
    });

    after(function() {
      mm.restore();
    });
  });


  describe('linux memory cpu load', function () {
    const mock = function(f, options,cb) {
      if (f === '/proc/stat') {
        return cb(null, mock_cpu);
      }
      if (f === '/proc/loadavg') {
        return cb(null, mock_load);
      } if (f === '/proc/meminfo') {
        return cb(null, mock_mem);
      }
      return '';
    };

    before(function () {
      mm(require('fs'), 'readFile', mock);
      mm.syncData(require('fs'), 'readFileSync', '');
      mm.syncData(require('fs'), 'existsSync', false);
      // type linux
      mm.syncData(require('os'), 'type', 'Linux');
      mm.syncData(require('os'), 'totalmem', 8041357312);
    });

    it('should ok', function (done) {
      system.init();
      system.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('system');
        expect(params.metrics).to.be.ok();
        const metrics = params.metrics;
        expect(metrics).to.have.key('uptime');
        expect(metrics).to.have.key('cpu_count');
        expect(metrics['load1']).equal(0.51);
        expect(metrics['load5']).equal(0.36);
        expect(metrics['load15']).equal(0.5);
        expect(metrics['totalmem']).equal(8041357312);
        expect(metrics['freemem']).equal(1922719744);
        expect(metrics['cpu']).equal(1 - 15160404 / 21835093);
        done();
      });
    });
    after(function() {
      mm.restore();
    });
  });

  describe('linux memory cpu load 1', function () {
    const mock = function(f, options,cb) {
      if (f === '/proc/stat') {
        return cb(null, mock_cpu_1);
      }
      if (f === '/proc/loadavg') {
        return cb(null, mock_load);
      } if (f === '/proc/meminfo') {
        return cb(null, mock_mem);
      }
      return '';
    };

    before(function () {
      mm(require('fs'), 'readFile', mock);
      mm.syncData(require('fs'), 'readFileSync', '');
      mm.syncData(require('fs'), 'existsSync', false);
      // type linux
      mm.syncData(require('os'), 'type', 'Linux');
      mm.syncData(require('os'), 'totalmem', 8041357312);
    });

    it('should ok', function (done) {
      system.init();
      system.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('system');
        expect(params.metrics).to.be.ok();
        const metrics = params.metrics;
        expect(metrics).to.have.key('uptime');
        expect(metrics).to.have.key('cpu_count');
        expect(metrics['load1']).equal(0.51);
        expect(metrics['load5']).equal(0.36);
        expect(metrics['load15']).equal(0.5);
        expect(metrics['totalmem']).equal(8041357312);
        expect(metrics['freemem']).equal(1922719744);
        expect(metrics['cpu']).equal(1 - 15160404 / 21835093);
        done();
      });
    });
    after(function() {
      mm.restore();
    });
  });

  describe('linux memory cpu load 2', function () {
    const mock = function(f, options,cb) {
      if (f === '/proc/stat') {
        return cb(null, mock_cpu_2);
      }
      if (f === '/proc/loadavg') {
        return cb(null, mock_load);
      } if (f === '/proc/meminfo') {
        return cb(null, mock_mem);
      }
      return '';
    };

    before(function () {
      mm(require('fs'), 'readFile', mock);
      mm.syncData(require('fs'), 'readFileSync', '');
      mm.syncData(require('fs'), 'existsSync', false);
      // type linux
      mm.syncData(require('os'), 'type', 'Linux');
      mm.syncData(require('os'), 'totalmem', 8041357312);
    });

    it('should ok', function (done) {
      system.init();
      system.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('system');
        expect(params.metrics).to.be.ok();
        const metrics = params.metrics;
        expect(metrics).to.have.key('uptime');
        expect(metrics).to.have.key('cpu_count');
        expect(metrics['load1']).equal(0.51);
        expect(metrics['load5']).equal(0.36);
        expect(metrics['load15']).equal(0.5);
        expect(metrics['totalmem']).equal(8041357312);
        expect(metrics['freemem']).equal(1922719744);
        expect(metrics['cpu']).equal(1 - 15160404 / 21835093);
        done();
      });
    });
    after(function() {
      mm.restore();
    });
  });


  describe('linux memory cpu load 3', function () {
    const mock = function(f, options,cb) {
      if (f === '/proc/stat') {
        return cb(null, mock_cpu_3);
      }
      if (f === '/proc/loadavg') {
        return cb(null, mock_load);
      } if (f === '/proc/meminfo') {
        return cb(null, mock_mem);
      }
      return '';
    };

    before(function () {
      mm(require('fs'), 'readFile', mock);
      mm.syncData(require('fs'), 'readFileSync', '');
      mm.syncData(require('fs'), 'existsSync', false);
      // type linux
      mm.syncData(require('os'), 'type', 'Linux');
      mm.syncData(require('os'), 'totalmem', 8041357312);
    });

    it('should ok', function (done) {
      system.init();
      system.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('system');
        expect(params.metrics).to.be.ok();
        const metrics = params.metrics;
        expect(metrics).to.have.key('uptime');
        expect(metrics).to.have.key('cpu_count');
        expect(metrics['load1']).equal(0.51);
        expect(metrics['load5']).equal(0.36);
        expect(metrics['load15']).equal(0.5);
        expect(metrics['totalmem']).equal(8041357312);
        expect(metrics['freemem']).equal(1922719744);
        expect(metrics['cpu']).equal(0);
        done();
      });
    });
    after(function() {
      mm.restore();
    });
  });


  describe('mock linux loadavg nok', function () {
    const mock = '110.51 aa 0.50 2/1253 58';

    before(function () {
      mm.data(require('fs'), 'readFile', mock);
      mm.syncData(require('os'), 'type', 'Linux');
    });

    it('should ok', function (done) {
      system.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('system');
        expect(params.metrics).to.be.ok();
        const metrics = params.metrics;
        expect(metrics).to.have.key('uptime');
        expect(metrics).to.have.key('load1');
        expect(metrics).to.have.key('load5');
        expect(metrics).to.have.key('load15');
        expect(metrics).to.have.key('cpu');
        expect(metrics).to.have.key('cpu_count');
        done();
      });
    });

    after(function() {
      mm.restore();
    });
  });

  describe('mock linux 4.13.0-32-generic free memory', function () {
    const mock = [
      'MemTotal:        7852888 kB',
      'MemFree:          635184 kB',
      'MemAvailable:    1877656 kB',
      'Buffers:          701844 kB',
      'Cached:          1307420 kB',
      'SwapCached:       232084 kB',
      'Active:          5392132 kB',
      'Inactive:        1387364 kB',
      'Active(anon):    4606812 kB',
      'Inactive(anon):   774872 kB',
      'Active(file):     785320 kB',
      'Inactive(file):   612492 kB',
      'Unevictable:        1448 kB',
      'DirectMap2M:     7340032 kB',
      'DirectMap1G:     1048576 kB'].join('\n');

    before(function () {
      mm.data(require('fs'), 'readFile', mock);
      mm.syncData(require('os'), 'type', 'Linux');
      mm.syncData(require('os'), 'release', '4.13.0-32-generic');
    });

    it('should ok', function (done) {
      system.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('system');
        expect(params.metrics).to.be.ok();
        const metrics = params.metrics;
        expect(metrics).to.have.key('freemem');
        expect(metrics.freemem).equal(1922719744);
        done();
      });
    });

    after(function() {
      mm.restore();
    });
  });

  describe('mock linux 3.14 free memory', function () {
    const mock = [
      'MemTotal:        7852888 kB',
      'MemFree:          635184 kB',
      'MemAvailable:    1877656 kB',
      'Buffers:          701844 kB',
      'Cached:          1307420 kB',
      'SwapCached:       232084 kB',
      'Active:          5392132 kB',
      'Inactive:        1387364 kB',
      'Active(anon):    4606812 kB',
      'Inactive(anon):   774872 kB',
      'Active(file):     785320 kB',
      'Inactive(file):   612492 kB',
      'Unevictable:        1448 kB',
      'DirectMap2M:     7340032 kB',
      'DirectMap1G:     1048576 kB'].join('\n');

    before(function () {
      mm.data(require('fs'), 'readFile', mock);
      mm.syncData(require('os'), 'type', 'Linux');
      mm.syncData(require('os'), 'release', '3.14');
    });

    it('should ok', function (done) {
      system.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('system');
        expect(params.metrics).to.be.ok();
        const metrics = params.metrics;
        expect(metrics).to.have.key('freemem');
        expect(metrics.freemem).equal(1922719744);
        done();
      });
    });

    after(function() {
      mm.restore();
    });
  });


  describe('mock linux 3.13 free memory', function () {
    const mock = [
      'MemTotal:        7852888 kB',
      'MemFree:          635184 kB',
      'MemAvailable:    1877656 kB',
      'Buffers:          701844 kB',
      'Cached:          1307420 kB',
      'SwapCached:       232084 kB',
      'Active:          5392132 kB',
      'Inactive:        1387364 kB',
      'Active(anon):    4606812 kB',
      'Inactive(anon):   774872 kB',
      'Active(file):     785320 kB',
      'Inactive(file):   612492 kB',
      'Unevictable:        1448 kB',
      'DirectMap2M:     7340032 kB',
      'DirectMap1G:     1048576 kB'].join('\n');

    before(function () {
      mm.data(require('fs'), 'readFile', mock);
      mm.syncData(require('os'), 'type', 'Linux');
      mm.syncData(require('os'), 'release', '3.13');
    });

    it('should ok', function (done) {
      system.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('system');
        expect(params.metrics).to.be.ok();
        const metrics = params.metrics;
        expect(metrics).to.have.key('freemem');
        expect(metrics.freemem).equal(2707914752);
        done();
      });
    });

    after(function() {
      mm.restore();
    });
  });


  describe('mock linux 2.13.0-32-generic free memory', function () {
    const mock = [
      'MemTotal:        7852888 kB',
      'MemFree:          635184 kB',
      'MemAvailable:    1877656 kB',
      'Buffers:          701844 kB',
      'Cached:          1307420 kB',
      'SwapCached:       232084 kB',
      'Active:          5392132 kB',
      'Inactive:        1387364 kB',
      'Active(anon):    4606812 kB',
      'Inactive(anon):   774872 kB',
      'Active(file):     785320 kB',
      'Inactive(file):   612492 kB',
      'Unevictable:        1448 kB',
      'DirectMap2M:     7340032 kB',
      'DirectMap1G:     1048576 kB'].join('\n');

    before(function () {
      mm.data(require('fs'), 'readFile', mock);
      mm.syncData(require('os'), 'type', 'Linux');
      mm.syncData(require('os'), 'release', '2.13.0-32-generic');
    });

    it('should ok', function (done) {
      system.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('system');
        expect(params.metrics).to.be.ok();
        const metrics = params.metrics;
        expect(metrics).to.have.key('freemem');
        expect(metrics.freemem).equal(2707914752);
        done();
      });
    });

    after(function() {
      mm.restore();
    });
  });


  describe('mock nonLinux', function () {
    const mock_stdout = 'nonLinux';

    before(function () {
      mm.syncData(require('os'), 'type', mock_stdout);
    });

    it('should ok', function (done) {
      system.init();
      system.run(function (err, params) {
        expect(err).not.to.be.ok();
        expect(params.type).to.be('system');
        expect(params.metrics).to.be.ok();
        const metrics = params.metrics;
        expect(metrics).to.have.key('uptime');
        expect(metrics).to.have.key('load1');
        expect(metrics).to.have.key('load5');
        expect(metrics).to.have.key('load15');
        expect(metrics).to.have.key('cpu');
        expect(metrics).to.have.key('cpu_count');
        done();
      });
    });
    after(function() {
      mm.restore();
    });
  });


});
