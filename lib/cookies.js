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
