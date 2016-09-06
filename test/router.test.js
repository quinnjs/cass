'use strict';
const assert = require('assertive');

const createRouter = require('../lib/router');

describe('router', () => {
  it('can create routes from a map', () => {
    const handleRoute = createRouter(new Map([
      ['GET /', () => 'root'],
      ['POST /users{/id}', (req, params) => `user: ${params.id}`],
      ['* /catch/all', (req, params) => `${req.method} ${JSON.stringify(params)}`],
    ]));
    assert.equal('root', handleRoute({ method: 'GET', url: '/' }));
    assert.equal('user: robin', handleRoute({ method: 'POST', url: '/users/robin' }));
    const err404 = assert.throws(() => {
      handleRoute({ method: 'GET', url: '/users/robin' });
    });
    assert.equal('no_route', err404.code);

    assert.equal('GET {}', handleRoute({ method: 'GET', url: '/catch/all' }));
    assert.equal('POST {}', handleRoute({ method: 'POST', url: '/catch/all' }));
    assert.equal('HEAD {}', handleRoute({ method: 'HEAD', url: '/catch/all' }));
    assert.equal('PUT {}', handleRoute({ method: 'PUT', url: '/catch/all' }));
    assert.equal('DELETE {}', handleRoute({ method: 'DELETE', url: '/catch/all' }));
    assert.equal('PATCH {}', handleRoute({ method: 'PATCH', url: '/catch/all' }));
  });
});
