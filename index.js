'use strict';

const json = require('quinn/respond').json;

function ptry(f, self, args) {
  return new Promise(function(resolve) {
    resolve(f.apply(self, args));
  });
}

function createErrorHandler(serialize) {
  function errorHandler(req, error) {
    let message = 'Something went wrong',
        statusCode = 500;

    if (error.name === 'HTTPError' || error.name === 'WebError') {
      message = error.message;
      statusCode = error.statusCode || error.status || 500;
    }

    const body = { error: { message: message, statusCode: statusCode } };

    return serialize(body).status(statusCode);
  }

  return errorHandler;
}

function cass(options, inner) {
  if (inner === undefined) {
    inner = options, options = {};
  }
  options = options || {};
  const serialize = options.serialize || json;
  const errorHandler = options.errorHandler || createErrorHandler(serialize);

  function resolveResponse(res) {
    if (res === undefined) return;
    return serialize(res);
  }

  function handler(req) {
    return ptry(inner, this, arguments)
      .then(resolveResponse)
      .catch(errorHandler.bind(null, req));
  }

  return handler;
}

module.exports = cass;
cass['default'] = cass;
cass['createErrorHandler'] = createErrorHandler;
