'use strict';
// From: github.com/github/fetch
function normalizeName(name) {
  if (typeof name !== 'string') {
    name = String(name);
  }
  if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
    throw new TypeError('Invalid character in header field name');
  }
  return name.toLowerCase();
}

function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return String(value);
}

// Basically: case-insensitive map with a twist (validates header names)
class Headers extends Map {
  constructor(headers) {
    super();

    Object.defineProperty(this, '_names', {
      configurable: true,
      enumerable: false,
      value: new Map(),
    });

    if (headers instanceof Headers) {
      for (const [name, value] of headers) {
        this.set(name, value);
      }
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(name => {
        this.set(name, headers[name]);
      });
    }
  }

  delete(name) {
    const normalized = normalizeName(name);
    this._names.delete(name);
    return super.delete(normalized);
  }

  has(name) {
    return this._names.has(normalizeName(name));
  }

  get(name) {
    const realName = this._names.get(normalizeName(name));
    if (realName === undefined) return undefined;
    return super.get(realName);
  }

  set(name, value) {
    const normalized = normalizeName(name);
    if (!this._names.has(normalized)) {
      this._names.set(normalized, name);
    }
    let realName = this._names.get(normalized);
    return super.set(realName, normalizeValue(value));
  }
}

class Response {
  constructor(statusCode, headers, body) {
    this.statusCode = statusCode;
    this.headers = new Headers(headers);
    this.body = body;
  }

  getHeader(name) {
    return this.headers.get(name);
  }

  removeHeader(name) {
    this.headers.delete(name);
  }

  setHeader(name, value) {
    this.headers.set(name, value);
  }
}

function respond({ statusCode, headers, body }) {
  return new Response(statusCode, headers, body);
}

module.exports = respond;
module.exports.default = respond;
module.exports.Response = Response;
module.exports.Headers = Headers;
