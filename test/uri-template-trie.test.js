'use strict';
const assert = require('assertive');

const URITemplateTrie = require('../lib/uri-template-trie');

describe('uri template trie', () => {
  describe('a trie', () => {
    const trie = new URITemplateTrie();

    before(() => {
      trie.insert('/', 'root-value');
      trie.insert('/static', 'static-value');
      trie.insert('/api/v1/endpoint', 'nested-value');
      trie.insert('{/id}', 'id-value');
      trie.insert('/users{/id}', 'just-user-id-value');
      trie.insert('/users{/id}{?show,query*}', 'user-id-value');
      trie.insert('/stuff{?show}', 'stuff-value');
      trie.insert('/comma-query{?show[]}', 'comma-value');
      trie.insert('/comma{/parts[]}', 'comma-path-value');
      trie.insert('/posts{/year,month,slug}', 'blog-value');
      trie.insert('/users{/id}{/more*}', 'splat-value');
      trie.insert('/users{/id}/exact', 'exact-value');
      trie.insert('/~{user}{/more*}', 'home-value');
    });

    new Map([
      ['/', { value: 'root-value', params: {} }],
      ['/static', { value: 'static-value', params: {} }],
      ['/api/v1/endpoint', { value: 'nested-value', params: {} }],
      ['/some-id', { value: 'id-value', params: { id: 'some-id' } }],
      ['/users/robin', { value: 'just-user-id-value', params: { id: 'robin' } }],
      ['/users/robin?show=full&some=more&extra=stuff', {
        value: 'user-id-value',
        params: { id: 'robin', show: 'full', query: { some: 'more', extra: 'stuff' } },
      }],
      ['/stuff', { value: 'stuff-value', params: {} }],
      ['/stuff?show=id,name', { value: 'stuff-value', params: { show: 'id,name' } }],
      ['/comma-query?show=id,name', { value: 'comma-value', params: { show: ['id', 'name'] } }],
      ['/comma-query?show=', { value: 'comma-value', params: { show: [] } }],
      ['/comma-query', { value: 'comma-value', params: {} }],
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
      ['/users/robin/exact', { value: 'exact-value', params: { id: 'robin' } }],
      ['/totally/a/404', null],
      ['/~robin/projects/quinn', {
        value: 'home-value',
        params: { user: 'robin', more: ['projects', 'quinn'] },
      }],
      ['/~hello%20world/projects/quinn', {
        value: 'home-value',
        params: { user: 'hello world', more: ['projects', 'quinn'] },
      }],
    ]).forEach((expected, uri) => {
      it(`routes ${uri}`, () => {
        const result = trie.find(uri);
        assert.deepEqual(expected, result);
      });
    });
  });
});
