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
