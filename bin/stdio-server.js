'use strict';
const http = require('http');
const Path = require('path');
const PassThrough = require('stream').PassThrough;

const respond = require('../lib/respond');

function writeResponse({ statusCode, headers, body }) {
  if (process.send) {
    const headersObj = {};
    for (const [name, value] of headers) {
      headersObj[name] = value;
    }
    process.send({ type: 'quinnjs:response', statusCode, headers: headersObj });
  } else {
    console.error('HTTP/1.1 %j %s', statusCode, http.STATUS_CODES[statusCode]);
    for (const [name, value] of headers) {
      console.error('%s: %s', name, value);
    }
    console.error('');
  }

  function sendEnd() {
    if (process.send) {
      process.send({ type: 'quinnjs:response-end' });
    } else {
      process.exit(0);
    }
  }

  if (!body) {
    sendEnd();
  } else if (typeof body === 'string' || Buffer.isBuffer(body)) {
    process.stdout.write(body);
    sendEnd();
  } else if (typeof body.pipe === 'function') {
    body.pipe(process.stdout, { end: false });
    body.on('end', sendEnd);
  } else {
    throw new TypeError('Unsupported body type ' + typeof body);
  }
}

function writeFatal(error) {
  return writeResponse(respond({
    statusCode: 500,
    headers: {
      'Content-Type': 'text/plain',
    },
    body: error.stack,
  }));
}

function throwAsync(e) {
  process.nextTick(() => { throw e; });
}

function handleFakeRequest() {
  const [,, handleModule, method, path, headersJSON] = process.argv;
  const handle = require(Path.resolve(handleModule));
  const fakeRequest = Object.assign(new PassThrough(), {
    method,
    path,
    headers: JSON.parse(headersJSON),
  });
  process.stdin.pipe(fakeRequest);
  return Promise.resolve(fakeRequest)
    .then(handle)
    .then(writeResponse)
    .catch(writeFatal)
    .catch(throwAsync);
}
handleFakeRequest();
