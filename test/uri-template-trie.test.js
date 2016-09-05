'use strict';
const querystring = require('querystring');
const assert = require('assertive');

const parseURITemplate = require('../lib/parse-uri-template');

const PATH_CHARS = '(?:[a-zA-Z0-9._~!$&\'()*+,;=:@-]|%[A-Fa-f0-9]{2})+';
const PATH_SEGMENT = `\\/(${PATH_CHARS})`;
const SPLAT_PATH_SEGMENTS = `((?:\\/${PATH_CHARS})+)`;
const FREEFORM = `^(${PATH_CHARS})`;

function parsePathSegmentSimple(segment) {
  return decodeURIComponent(segment);
}

function parsePathSegment(segment, explode, list) {
  if (explode && list) {
    throw new Error('Cannot splat & split the same path segment');
  }

  if (list) {
    return segment.split(',').map(parsePathSegmentSimple);
  }
  if (explode) {
    return segment.substr(1).split('/').map(parsePathSegmentSimple);
  }
  return decodeURIComponent(segment);
}

function parseQueryValue(value, list) {
  if (list) {
    return Array.isArray(value) ? value : value.split(',');
  }
  return Array.isArray(value) ? value[value.length - 1] : value;
}

const Matchers = {
  ['<null>'](vars) {
    if (vars.length !== 1) {
      throw new Error('Freeform match only supports exactly one var');
    }
    const spec = vars[0];
    if (spec.prefix || spec.explode) {
      throw new Error('Modifiers not supported for freeform match');
    }
    return function resolve(uri) {
      const m = uri.match(FREEFORM);
      if (!m) return null;
      return {
        params: { [spec.name]: m[1] },
        rest: uri.slice(m[0].length),
      };
    };
  },

  ['/'](vars) {
    const varPatterns = vars.map(spec => {
      if (spec.prefix) {
        throw new Error(`Prefix not supported: ${JSON.stringify(spec)}`);
      }
      if (spec.explode) {
        return SPLAT_PATH_SEGMENTS;
      }
      return PATH_SEGMENT;
    });
    const pattern = new RegExp(`^${varPatterns.join('')}`);
    return function resolve(uri) {
      if (uri[0] !== '/') return null;
      const m = uri.match(pattern);
      if (!m) return null;
      const params = vars.reduce((bindings, spec, idx) => {
        bindings[spec.name] = parsePathSegment(m[idx + 1], spec.explode, spec.list);
        return bindings;
      }, {});
      return { rest: uri.slice(m[0].length), params };
    };
  },

  ['?'](vars) {
    let splatVarName;
    const nonSplat = vars.filter(spec => {
      if (spec.explode) splatVarName = spec.name;
      return !spec.explode;
    });
    return function resolve(uri) {
      if (uri[0] !== '?') return null;
      const query = querystring.parse(uri.slice(1));
      const params = nonSplat.reduce((bindings, spec) => {
        const value = query[spec.name];
        // TODO: some notion of "required"..?
        if (value === undefined) return bindings;
        delete query[spec.name];

        bindings[spec.name] = parseQueryValue(value, spec.list);
        return bindings;
      }, {});
      if (splatVarName) {
        params[splatVarName] = query;
        return { params, rest: '' };
      }
      const queryRest = querystring.stringify(query);
      return { params, rest: queryRest ? `&${queryRest}` : '' };
    };
  },
};

function createMatcher(operator, vars) {
  const factory = Matchers[operator === null ? '<null>' : operator];
  if (!factory) {
    throw new Error(`Operator ${operator} is not supported`);
  }
  return factory(vars);
}

// TODO: Actually build a proper trie with lookups instead of "startsWith".
// At the very least it should split by '/', '?', and '&'.
class TrieNode {
  constructor(value) {
    this._value = value;
    this._literals = new Map();
    this._vars = new Map();
  }

  get value() { return this._value; }

  _insertLiteral(literal, remaining, value) {
    // TODO: Expand '/foo/bar' into ['/foo', '/bar']
    if (!this._literals.has(literal)) {
      this._literals.set(literal, new TrieNode());
    }
    this._literals.get(literal).insert(remaining, value);
  }

  _insertExpression(expr, remaining, value) {
    // TODO: Expand '{/foo,bar}' into '{/foo}', '{/bar}'
    let varMatcher;
    if (!this._vars.has(expr.source)) {
      varMatcher = createMatcher(expr.operator, expr.vars);
      varMatcher.node = new TrieNode();
      this._vars.set(expr.source, varMatcher);
    } else {
      varMatcher = this._vars.get(expr.source);
    }
    varMatcher.node.insert(remaining, value);
  }

  insert(parts, value) {
    if (parts.length === 0) {
      // TODO: warn that we just changed the value if it was already set
      this._value = value;
      return;
    }
    const next = parts[0];
    if (next.type === 'literal') {
      this._insertLiteral(next.value, parts.slice(1), value);
    } else if (next.type === 'expr') {
      this._insertExpression(next, parts.slice(1), value);
    } else {
      throw new Error(`Unknown template part ${next.type}`);
    }
  }

  find(uri, params) {
    if (uri.length === 0) {
      return this._value !== undefined ? { value: this._value, params } : null;
    }

    const directMatch = this._literals.get(uri);
    if (directMatch) {
      const directResult = directMatch.find('', params);
      if (directResult) return directResult;
    }

    for (const literal of this._literals.keys()) {
      if (uri.indexOf(literal) !== 0) continue;
      const literalResult = this._literals.get(literal).find(uri.slice(literal.length), params);
      if (literalResult) return literalResult;
    }

    for (const varMatcher of this._vars.values()) {
      const varMatch = varMatcher(uri);
      if (varMatch === null) continue;
      // TODO: check for name collisions
      const varBindings = Object.assign({}, params, varMatch.params);
      const varSpecResult = varMatcher.node.find(varMatch.rest, varBindings);
      if (varSpecResult) return varSpecResult;
    }

    if (uri[0] === '&' || uri[0] === '?') {
      return this._value !== undefined ? { value: this._value, params } : null;
    }
    return null;
  }
}

class URITemplateTrie {
  constructor() {
    this._root = new TrieNode(undefined);
  }

  insert(template, value) {
    const parts = parseURITemplate(template);
    this._root.insert(parts, value);
  }

  find(uri) {
    if (uri[0] !== '/') {
      throw new TypeError(`Expected leading slash in ${uri}`);
    }
    return this._root.find(uri, {});
  }
}

describe('uri template trie', () => {
  describe('a trie', () => {
    const trie = new URITemplateTrie();

    before(() => {
      trie.insert('/', 'root-value');
      trie.insert('/static', 'static-value');
      trie.insert('{/id}', 'id-value');
      trie.insert('/users{/id}', 'just-user-id-value');
      trie.insert('/users{/id}{?show,query*}', 'user-id-value');
      trie.insert('/stuff{?show}', 'stuff-value');
      trie.insert('/comma-query{?show[]}', 'comma-value');
      trie.insert('/comma{/parts[]}', 'comma-path-value');
      trie.insert('/posts{/year,month,slug}', 'blog-value');
      trie.insert('/users{/id}{/more*}', 'splat-value');
      trie.insert('/~{user}{/more*}', 'home-value');
    });

    new Map([
      ['/', { value: 'root-value', params: {} }],
      ['/static', { value: 'static-value', params: {} }],
      ['/some-id', { value: 'id-value', params: { id: 'some-id' } }],
      ['/users/robin', { value: 'just-user-id-value', params: { id: 'robin' } }],
      ['/users/robin?show=full&some=more&extra=stuff', {
        value: 'user-id-value',
        params: { id: 'robin', show: 'full', query: { some: 'more', extra: 'stuff' } },
      }],
      ['/stuff?show=id,name', { value: 'stuff-value', params: { show: 'id,name' } }],
      ['/comma-query?show=id,name', { value: 'comma-value', params: { show: ['id', 'name'] } }],
      ['/comma/foo,bar,z', { value: 'comma-path-value', params: { parts: ['foo', 'bar', 'z'] } }],
      ['/posts/2016/07/my%20post', {
        value: 'blog-value',
        params: { year: '2016', month: '07', slug: 'my post' },
      }],
      ['/users/robin/one', { value: 'splat-value', params: { id: 'robin', more: ['one'] } }],
      ['/users/robin/one/and/two/and/three?is=ignored', {
        value: 'splat-value',
        params: { id: 'robin', more: ['one', 'and', 'two', 'and', 'three'] },
      }],
      ['/totally/a/404', null],
      ['/~robin/projects/quinn', {
        value: 'home-value',
        params: { user: 'robin', more: ['projects', 'quinn'] },
      }],
    ]).forEach((expected, uri) => {
      it(`routes ${uri}`, () => {
        const result = trie.find(uri);
        assert.deepEqual(expected, result);
      });
    });
  });
});
