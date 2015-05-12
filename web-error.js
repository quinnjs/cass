'use strict';

const http = require('http');

function WebError(message, statusCode) {
  if (typeof message === 'number') {
    statusCode = message;
    message = http.STATUS_CODES[statusCode];
  }

  this.message = message;
  this.statusCode = statusCode || 500;
  this.name = 'WebError';
  Error.captureStackTrace(this, WebError);
}
WebError.prototype = Object.create(Error.prototype);
WebError.prototype.constructor = WebError;

module.exports = WebError;
