'use strict';
const cookie = require('cookie');

function appendHeader(response, name, value) {
  const prev = response.getHeader(name);
  if (!prev) {
    response.setHeader(name, value);
    return;
  }

  response.setHeader(name, [].concat(prev, value));
}

function parseCookies(request) {
  if (request.cookies) return request.cookies;
  const cookieHeader = request.headers && request.headers.cookie;
  if (!cookieHeader) return {};
  return cookie.parse(cookieHeader);
}

const COOKIE_CACHE = Symbol('@cass/cookies:COOKIE_CACHE');

function getCookieCache(request) {
  if (COOKIE_CACHE in request) {
    return request[COOKIE_CACHE];
  }
  request[COOKIE_CACHE] = parseCookies(request);
  return request[COOKIE_CACHE];
}

function isDeleteOptions(options) {
  return options.expires && options.expires.getTime() < Date.now();
}

class Cookies {
  constructor(request, response, defaults) {
    this._request = request;
    this._response = null;

    this._values = getCookieCache(request);
    this._defaults = defaults || {};

    if (response) {
      this.writeTo(response);
    } else {
      this._changes = new Map();
    }
  }

  static fromRequest(req, defaults) {
    return new Cookies(req, null, defaults);
  }

  delete(name, options) {
    const opts = Object.assign({ expires: new Date(1), path: '/' }, options);
    this.set(name, '', opts);
  }

  has(name) {
    return name in this._values;
  }

  get(name) {
    return this._values[name];
  }

  set(name, value, options) {
    const opts = Object.assign({}, this._defaults, options);
    if (isDeleteOptions(opts)) {
      delete this._values[name];
    } else {
      this._values[name] = value;
    }
    const serialized = cookie.serialize(name, value, opts);
    if (this._response) {
      appendHeader(this._response, 'Set-Cookie', serialized);
    } else {
      this._changes.set(name, serialized);
    }
  }

  writeTo(response) {
    const changes = this._changes;
    this._response = response;
    this._changes = null;

    if (changes && changes.size) {
      appendHeader(response, 'Set-Cookie', Array.from(changes.values()));
    }

    return response;
  }
}
module.exports = Cookies;
