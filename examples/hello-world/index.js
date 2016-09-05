'use strict';
const Cookies = require('../../lib/cookies');
const respond = require('../../lib/respond');

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('error', reject);
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

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
