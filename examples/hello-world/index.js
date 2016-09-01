'use strict';
const Cookies = require('../../lib/cookies');
const respond = require('../../lib/respond');

async function handle(req) {
  const cookies = Cookies.fromRequest(req, { path: '/' });
  cookies.set('out', cookies.get('in') || 'zapp');
  // throw new Error('huh?');
  return cookies.writeTo(respond({
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'Hello World!' }),
  }));
}
module.exports = handle;
