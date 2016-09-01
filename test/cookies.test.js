'use strict';
const assert = require('assertive');

const Cookies = require('../lib/cookies');
const Response = require('../lib/respond').Response;

describe('Cookies', () => {
  it('is a class', () => {
    assert.expect(new Cookies({}) instanceof Cookies);
  });

  describe('.get', () => {
    it('returns existing cookies from req.cookies', () => {
      const cookies = Cookies.fromRequest({ cookies: { a: '10', b: '20' } });
      assert.equal('10', cookies.get('a'));
      assert.equal('20', cookies.get('b'));
    });

    it('returns existing cookies from cookie header', () => {
      const cookies = Cookies.fromRequest({
        headers: {
          cookie: 'a=10; foo=bar%20stuff'
        }
      });
      assert.equal('10', cookies.get('a'));
      assert.equal('bar stuff', cookies.get('foo'));
    });
  });

  describe('.set', () => {
    it('syncs changes to req.cookies', () => {
      const old = { existing: '10', foo: 'bar%20stuff' };
      const cookies = Cookies.fromRequest({ cookies: old });
      cookies.set('new-key', 'more stuff');
      cookies.set('foo', 'new-foo');
    });

    it('sets cookie headers immediately if the target is known', () => {
      const old = { existing: '10', foo: 'bar stuff', outdated: 'thing-to-delete' };
      const target = new Response();
      const cookies = new Cookies({ cookies: old }, target, { path: '/' });
      // TODO: more interesting stuff in options
      cookies.set('new-key', 'more stuff');
      cookies.set('foo', 'new-foo');
      cookies.delete('outdated');
      cookies.set('foo', 'newer-foo');

      assert.equal('more stuff', cookies.get('new-key'));
      assert.equal('newer-foo', cookies.get('foo'));
      assert.equal('10', cookies.get('existing'));
      assert.equal(undefined, cookies.get('outdated'));
      assert.equal(false, cookies.has('outdated'));
      assert.equal(undefined, old.outdated);

      assert.deepEqual([
        'new-key=more%20stuff; Path=/',
        'foo=new-foo; Path=/',
        'outdated=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'foo=newer-foo; Path=/'
      ], target.getHeader('Set-Cookie'));
    });

    it('does not send an empty set-cookie header', () => {
      const cookies = Cookies.fromRequest({});
      const target = cookies.writeTo(new Response());
      assert.equal(undefined, target.getHeader('Set-Cookie'));
    });

    it('can defer setting the cookie headers', () => {
      const old = { existing: '10', foo: 'bar stuff', outdated: 'thing-to-delete' };
      const cookies = Cookies.fromRequest({ cookies: old }, { path: '/' });
      // TODO: more interesting stuff in options
      cookies.set('new-key', 'more stuff');
      cookies.set('foo', 'new-foo');
      cookies.delete('outdated');
      cookies.set('foo', 'newer-foo');

      const target = new Response();
      assert.equal(
        '.writeTo returns the target',
        target, cookies.writeTo(target));

      assert.equal('more stuff', cookies.get('new-key'));
      assert.equal('newer-foo', cookies.get('foo'));
      assert.equal('10', cookies.get('existing'));
      assert.equal(undefined, cookies.get('outdated'));
      assert.equal(false, cookies.has('outdated'));

      assert.deepEqual([
        'new-key=more%20stuff; Path=/',
        'foo=newer-foo; Path=/',
        'outdated=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      ], target.getHeader('Set-Cookie'));
    });
  });
});
