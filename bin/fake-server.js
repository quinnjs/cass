'use strict';
const respond = require('../lib/respond');

function writeResponse({ statusCode, headers, body }) {
  const headersObj = {};
  for (const [name, value] of headers) {
    headersObj[name] = value;
  }
  process.send({ type: 'quinnjs:response', statusCode, headers: headersObj });

  function sendEnd() {
    process.send({ type: 'quinnjs:response-end' });
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
  const handle = require(handleModule);
  const fakeRequest = { method, path, headers: JSON.parse(headersJSON) };
  return Promise.resolve(fakeRequest)
    .then(handle)
    .then(writeResponse)
    .catch(writeFatal)
    .catch(throwAsync);
}
handleFakeRequest();
