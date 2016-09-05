'use strict';
const querystring = require('querystring');
// const assert = require('assertive');

const parseURITemplate = require('../lib/parse-uri-template');

const Matchers = {
  ['/'](vars) {
    const varPatterns = vars.map(spec => {
      if (spec.explode || spec.prefix) {
        throw new Error(`Extensions not supported: ${JSON.stringify(spec)}`);
      }
      return '\\/((?:[a-zA-Z0-9._~!$&\'()*+,;=:@-]|%[A-Fa-f0-9]{2})+)';
    });
    const pattern = new RegExp(`^${varPatterns.join('')}`);
    return function resolve(uri) {
      const m = uri.match(pattern);
      if (!m) return null;
      const params = vars.reduce((bindings, spec, idx) => {
        bindings[spec.name] = m[idx + 1];
        return bindings;
      }, {});
      return { rest: uri.slice(m[0].length), params };
    };
  },

  ['?'](vars) {
    return function resolve(uri) {
      if (uri[0] !== '?') return null;
      const query = querystring.parse(uri.slice(1));
      const params = vars.reduce((bindings, spec) => {
        const value = query[spec.name];
        // TODO: some notion of "required"..?
        if (value === undefined) return bindings;
        delete query[spec.name];

        bindings[spec.name] = value;
        return bindings;
      }, {});
      const queryRest = querystring.stringify(query);
      return { params, rest: queryRest ? `&${queryRest}` : '' };
    };
  },
};

function createMatcher(operator, vars) {
  const factory = Matchers[operator];
  if (!factory) {
    throw new Error(`Operator ${operator} is not supported`);
  }
  return factory(vars);
}

class TrieNode {
  constructor(value) {
    this._value = value;
    this._literals = new Map();
    this._vars = [];
  }

  get value() { return this._value; }

  _insertLiteral(literal, remaining, value) {
    if (!this._literals.has(literal)) {
      this._literals.set(literal, new TrieNode());
    }
    this._literals.get(literal).insert(remaining, value);
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
      const matcher = createMatcher(next.operator, next.vars);
      // TODO: find existing pattern..?
      const node = matcher.node = new TrieNode();
      this._vars.push(matcher);
      node.insert(parts.slice(1), value);
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

    // TODO: prefer longest literal
    for (const literal of this._literals.keys()) {
      if (uri.indexOf(literal) !== 0) continue;
      const literalResult = this._literals.get(literal).find(uri.slice(literal.length), params);
      if (literalResult) return literalResult;
    }

    for (const varSpec of this._vars) {
      const varMatch = varSpec(uri);
      if (varMatch === null) continue;
      // TODO: check for name collisions
      const varBindings = Object.assign({}, params, varMatch.params);
      const varSpecResult = varSpec.node.find(varMatch.rest, varBindings);
      if (varSpecResult) return varSpecResult;
    }

    // TODO: ignore additional query args & potentially score the result (?)
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

describe('uri template tree', () => {
  it('supports all kinds of stuff', () => {
    const trie = new URITemplateTrie();
    trie.insert('/', 'root-value');
    trie.insert('/static', 'static-value');
    trie.insert('{/id}', 'id-value');
    trie.insert('/users{/id}{?show}', 'show-value');
    trie.insert('/posts{/year,month,slug}', 'blog-value');

    [
      '/',
      '/static',
      '/some-id',
      '/users/robin?show=full',
      '/posts/2016/07/my-post',
    ].forEach(uri => {
      const result = trie.find(uri);
      console.log(uri, result);
    });
  });
});
