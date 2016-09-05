'use strict';
function sendResponse(response, { statusCode, headers, body }) {
  response.statusCode = statusCode || 200;
  for (const [name, value] of headers) {
    response.setHeader(name, value);
  }
  if (!body) {
    response.end();
  } else if (typeof body === 'string' || Buffer.isBuffer(body)) {
    response.end(body);
  } else if (typeof body.pipe === 'function') {
    body.pipe(response);
  } else {
    throw new TypeError(`Unsupported body type ${typeof body}`);
  }
}

function sendFatal(response, error) {
  /* eslint-disable no-console */
  console.error(error);
  response.statusCode = 500;
  try {
    response.end('Fatal');
  } catch (endError) {
    console.error('Failed to end response', endError);
  }
  /* eslint-enable no-console */
}

function quinn(handle) {
  return function onRequest(request, response) {
    Promise.resolve(request)
      .then(handle)
      .then(sendResponse.bind(null, response))
      .catch(sendFatal.bind(null, response));
  };
}
module.exports = quinn;
