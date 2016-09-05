'use strict';
const assert = require('assertive');

const parseURITemplate = require('../lib/parse-uri-template');

describe('parseURITemplate', () => {
  it('returns an empty array for empty input', () => {
    assert.deepEqual([], parseURITemplate(''));
  });

  it('parses base case', () => {
    const parts = parseURITemplate('{id}');
    assert.equal('expr', parts[0].type);
    assert.equal('id', parts[0].vars[0].name);
    assert.equal(false, parts[0].vars[0].explode);
    assert.equal(null, parts[0].vars[0].prefix);
  });

  it('parses explode', () => {
    const parts = parseURITemplate('{id*}');
    assert.equal('expr', parts[0].type);
    assert.equal('id', parts[0].vars[0].name);
    assert.equal(true, parts[0].vars[0].explode);
    assert.equal(null, parts[0].vars[0].prefix);
  });

  it('parses prefixes', () => {
    const parts = parseURITemplate('{id:42}');
    assert.equal('expr', parts[0].type);
    assert.equal(null, parts[0].operator);
    assert.equal('id', parts[0].vars[0].name);
    assert.equal(false, parts[0].vars[0].explode);
    assert.equal(42, parts[0].vars[0].prefix);
  });

  it('parses operator /', () => {
    const parts = parseURITemplate('{/id*}');
    assert.equal('expr', parts[0].type);
    assert.equal('/', parts[0].operator);
    assert.equal('id', parts[0].vars[0].name);
    assert.equal(true, parts[0].vars[0].explode);
    assert.equal(null, parts[0].vars[0].prefix);
  });

  it('parses operator ?', () => {
    const parts = parseURITemplate('{?id:2}');
    assert.equal('expr', parts[0].type);
    assert.equal('?', parts[0].operator);
    assert.equal('id', parts[0].vars[0].name);
    assert.equal(false, parts[0].vars[0].explode);
    assert.equal(2, parts[0].vars[0].prefix);
  });
});
