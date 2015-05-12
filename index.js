'use strict';

const json = require('quinn/respond').json;

const WebError = require('./web-error');

function ptry(f, self, args) {
  return new Promise(function(resolve) {
    resolve(f.apply(self, args));
  });
}

function makeDefaultErrorHandler(serialize) {
  function defaultErrorHandler(req, error) {
    let message = 'Something went wrong',
        statusCode = 500;

    if (error instanceof WebError) {
      message = error.message;
      statusCode = error.statusCode;
    }

    const body = { error: { message: message, statusCode: statusCode } };

    return serialize(body).status(statusCode);
  }

  return defaultErrorHandler;
}

const defaultErrorHandler = makeDefaultErrorHandler(json);

function cass(options) {
  options = options || {};
  const serialize = options.serialize || json;
  const errorHandler = options.errorHandler || makeDefaultErrorHandler(serialize);

  function resolveResponse(res) {
    if (res === undefined) return;
    return serialize(res);
  }

  function withHandler(inner) {
    return function (req) {
      return ptry(inner, this, arguments)
        .then(resolveResponse)
        .catch(errorHandler.bind(null, req));
    };
  }

  return withHandler;
}

module.exports = cass;
cass['default'] = cass;
cass['defaultErrorHandler'] = defaultErrorHandler;
cass['makeDefaultErrorHandler'] = makeDefaultErrorHandler;
cass['WebError'] = WebError;
