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
const URITemplateTrie = require('./uri-template-trie');

const DEFAULT_METHODS = [
  'GET', 'POST', 'PUT', 'HEAD', 'DELETE', 'PATCH',
];

// 'GET /foo/bar'
// '* /foo/bar'
function extractMethod(route) {
  const space = route.indexOf(' ');
  if (space < 1) {
    throw new TypeError(`Invalid route: ${route}`);
  }
  return { method: route.slice(0, space), uri: route.slice(space + 1) };
}

function createRouter(routes) {
  const byMethod = {};

  function getTrieByMethod(method) {
    if (!(method in byMethod)) {
      byMethod[method] = new URITemplateTrie();
    }
    return byMethod[method];
  }

  function addRoute(method, uri, handler) {
    if (method === '*') {
      DEFAULT_METHODS.forEach(defaultMethod => addRoute(defaultMethod, uri, handler));
    } else {
      getTrieByMethod(method).insert(uri, handler);
    }
  }

  for (const route of routes) {
    const parsed = extractMethod(route[0]);
    addRoute(parsed.method, parsed.uri, route[1]);
  }

  function handleRoute(req) {
    const result = getTrieByMethod(req.method).find(req.url);
    if (!result) {
      const err = new Error('Could not resolve route');
      err.code = 'no_route';
      throw err;
    }
    const handle = result.value;
    return handle(req, result.params);
  }

  return handleRoute;
}
module.exports = createRouter;
