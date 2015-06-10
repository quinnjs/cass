'use strict';

const json = require('quinn/respond').json;
const createRouter = require('wegweiser');

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

function cass() {
  const serialize = json;
  const errorHandler = createErrorHandler(json);

  const router = createRouter.apply(null, arguments);

  function resolveResponse(res) {
    if (res === undefined) return;
    return json(res);
  }

  function handler(req) {
    return ptry(router, this, arguments)
      .then(resolveResponse)
      .catch(errorHandler.bind(null, req));
  }

  return handler;
}

module.exports = cass;
cass['default'] = cass;
cass['createErrorHandler'] = createErrorHandler;
