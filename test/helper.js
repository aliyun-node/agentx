'use strict';

exports.sleep = function sleep(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
};

exports.check = async function check(agent) {
  for (let i = 0; i < 10; i++) {
    await exports.sleep(100);
    if (agent.state === 'work') {
      return 'ok';
    }
  }

  return 'failed';
};
