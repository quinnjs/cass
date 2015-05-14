'use strict';

const test = require('tape');

const cass = require('../');

const testQuinnHandler = require('./test-quinn-handler');

test('render hello world', function(t) {
  t.plan(3);

  function renderHelloWorld() {
    return 'Hello, World!';
  }

  function verify(res) {
    t.equal(res.statusCode, 200, 'Returns 200');
    t.equal(res.bodyString, '"Hello, World!"', 'Correct body');
    t.equal(res.getHeader('content-type'), 'application/json; charset=utf-8', 'is json');
    t.end();
  }

  testQuinnHandler(cass(renderHelloWorld))
    .then(verify, t.end);
});
