'use strict';

const json = require('quinn/respond').json;

function ptry(f, self, args) {
  return new Promise(function(resolve) {
    resolve(f.apply(self, args));
  });
}

function createErrorHandler(serialize) {
  function errorHandler(req, error) {
    let body,
        statusCode = 500,
        headers = {};

    if (error.isBoom && error.output) {
      statusCode = error.output.statusCode;
      headers = error.output.headers;
      body = error.output.payload;
    } else {
      body = {
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Something went wrong'
      };
    }

    const res = serialize(body);
    res.statusCode = statusCode;
    for (const name of Object.keys(headers)) {
      res.setHeader(name, headers[name]);
    }
    return res;
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
