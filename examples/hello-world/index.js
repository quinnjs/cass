'use strict';
const parseBody = require('parsed-body/json');

const Cookies = require('../../lib/cookies');
const respond = require('../../lib/respond');

async function handle(req) {
  const cookies = Cookies.fromRequest(req, { path: '/' });
  cookies.set('out', cookies.get('in') || 'zapp');

  const body = await parseBody(req);

  // throw new Error('huh?');

  return cookies.writeTo(
    respond.json({ message: 'Hello World!', body: body || undefined })
  );
}
module.exports = handle;
