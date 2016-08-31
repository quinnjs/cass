'use strict';
const Cookies = require('./cookies');
const Response = require('./response');

function respond({ statusCode, headers, body }) {
  return new Response(statusCode, headers, body);
}

function sendResponse({ statusCode, headers, body }, target) {
  target.statusCode = statusCode || 200;
  for (const [name, value] of headers) {
    target.setHeader(name, value);
  }
  if (!body) {
    target.end();
  } else if (typeof body === 'string' || Buffer.isBuffer(body)) {
    target.end(body);
  } else if (typeof body.pipe === 'function') {
    body.pipe(target);
  } else {
    throw new TypeError('Unsupported body type ' + typeof body);
  }
}

async function handle(req) {
  const cookies = Cookies.fromRequest(req, { path: '/' });
  cookies.set('out', cookies.get('in') || 'bar');
  return cookies.writeTo(respond({
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: '{"message":"Hello World!"}\n'
  }));
}

const http = require('http');
http
  .createServer((req, res) => {
    handle(req)
      .then(result => {
        return sendResponse(result, res);
      })
      .catch(error => {
        console.error(error);
        res.statusCode = 500;
        try {
          res.end('Fatal');
        } catch (err) {
          console.error('Failed to end response', err);
        }
      });
  })
  .listen(3000);
