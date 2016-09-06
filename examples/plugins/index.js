'use strict';
const Cookies = require('../../lib/cookies');
const respond = require('../../lib/respond');
const createRouter = require('../../lib/router');

class CookiesPlugin {
  constructor() {
    this.provides = new Map([
      [Cookies, this.createCookies],
      ['cookies', this.createCookies],
    ]);
  }

  createCookies(req) {
    return Cookies.fromRequest(req);
  }
}
// Reflect meta data etc.
CookiesPlugin.prototype.createCookies['@design:paramtypes'] = ['req'];

function isConstructor(fn) {
  return fn.prototype && fn.prototype.constructor === fn;
}

function initPlugins(Plugins) {
  const providesGlobal = new Map();
  const provides = new Map();

  function instantiate(instances, providers, factory, paramTypes, context) {
    function resolve(token) {
      if (instances.has(token)) return instances.get(token);
      instances.set(token, null); // TODO: handle circular dependencies

      const provider = provides.get(token);
      if (!provider) throw new Error(`Could not find provider for ${token}`);
      return instantiate(
        instances, providers,
        provider.factory, provider.paramTypes, provider.context);
    }

    const args = paramTypes.map(resolve);
    if (context) {
      return factory.apply(context, args);
    } else if (isConstructor(factory)) {
      /* eslint-disable new-cap */
      return new factory(...args);
      /* eslint-enable new-cap */
    }
    return factory(...args);
  }

  function inject(req, fn, paramTypes) {
    const instances = new Map([['req', req]]);
    return instantiate(instances, provides, fn, paramTypes);
  }

  function injectGlobal(/* fn, paramTypes */) {
  }

  function parseProvider(factory, context) {
    const paramTypes = factory['@design:paramtypes'] || [];
    return { factory, context, paramTypes };
  }

  function createPlugin(Plugin) {
    const plugin = new Plugin();

    if (plugin.provides) {
      // TODO: parse dependencies of provider, then bind & do inject.
      plugin.provides
        .forEach((provider, token) => provides.set(token, parseProvider(provider, plugin)));
    }

    if (plugin.providesGlobal) {
      plugin.providesGlobal
        .forEach((provider, token) => providesGlobal.set(token, parseProvider(provider, plugin)));
    }

    return plugin;
  }

  return {
    plugins: Plugins.map(createPlugin),
    inject, injectGlobal,
  };
}
const cass = initPlugins([CookiesPlugin]);

class ClassController {
  constructor(cookies) {
    this.cookies = cookies;
  }

  index() {
    this.cookies.set('foo', 'bar');
    return respond.json({ fromClass: true });
  }
}

function functionController(cookies) {
  return {
    main() {
      cookies.set('foo', 'bar');
      return respond.json({ fromFunction: true });
    },
  };
}

function toHandler(inject, controllers, routeEntry) {
  if (typeof routeEntry === 'function') {
    return routeEntry;
  } else if (typeof routeEntry !== 'string') {
    throw new Error('Invalid route');
  }
  const parts = routeEntry.split('#');
  const Controller = controllers[parts[0]];
  if (!Controller) {
    throw new Error(`Controller ${routeEntry} not found`);
  }
  const action = parts[1] || 'index';
  return function handleControllerAction(req, params) {
    const instance = inject(req, Controller, [Cookies]);
    return instance[action](req, params);
  };
}

function buildControllerRoutes(inject, controllers, rawRoutes) {
  const routeMap = new Map();
  for (const key of Object.keys(rawRoutes)) {
    routeMap.set(key, toHandler(inject, controllers, rawRoutes[key]));
  }
  return routeMap;
}

const routes = buildControllerRoutes(cass.inject, {
  classStyle: ClassController,
  fnStyle: functionController,
}, {
  'GET /': 'classStyle',
  'GET /fn': 'fnStyle#main',
});

module.exports = createRouter(routes);
