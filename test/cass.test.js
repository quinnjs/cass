'use strict';
var assert = require('assertive');

var cass = require('../');

describe('cass', function () {
  it('is empty', function () {
    assert.deepEqual({}, cass);
  });
});
