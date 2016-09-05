/*
 * Copyright (c) 2016, Jan Krems
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of the copyright holder nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
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
    const realName = this._names.get(normalized);
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

function json(value) {
  return respond({
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(value),
  });
}

module.exports = respond;
module.exports.default = respond;
module.exports.json = json;
module.exports.Response = Response;
module.exports.Headers = Headers;
