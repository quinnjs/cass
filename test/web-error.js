'use strict';

const test = require('tape');

const WebError = require('../web-error');

test('WebError(string, number)', function(t) {
  const e = new WebError('msg', 403);
  t.equal(e.message, 'msg');
  t.equal(e.statusCode, 403);
  t.end();
});

test('WebError(string)', function(t) {
  const e = new WebError('msg');
  t.equal(e.message, 'msg');
  t.equal(e.statusCode, 500);
  t.end();
});

test('WebError(number)', function(t) {
  const e = new WebError(404);
  t.equal(e.message, 'Not Found');
  t.equal(e.statusCode, 404);
  t.end();
});
