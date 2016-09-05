'use strict';
const assert = require('assertive');

const OPERATORS = '+#./;?&=,!@|';

const VARCHAR = '(?:[A-Za-z_]|%[0-9A-Fa-f]{2})';
const VARNAME = `${VARCHAR}+(?:\\.${VARCHAR}+)*`;
const MODIFIER = '(?:(\\*)|(?::([1-9][0-9]{0,3})))';
const VAR_SPEC = new RegExp(`^(${VARNAME})${MODIFIER}?$`);

function parseVarSpec(varSpec) {
  const match = varSpec.match(VAR_SPEC);
  if (!match) {
    throw new SyntaxError(`Invalid var-spec "${varSpec}"`);
  }
  const explode = !!match[2];
  const prefix = match[3] ? +match[3] : null;
  return { type: 'var', name: match[1], explode, prefix };
}

/**
 * @param {string} expr
 */
function parseExpression(expr) {
  let operator;
  let varSpecs;
  if (OPERATORS.indexOf(expr[0]) !== -1) {
    operator = expr[0];
    varSpecs = expr.slice(1);
  } else {
    operator = null;
    varSpecs = expr;
  }
  const vars = varSpecs.split(',').map(parseVarSpec);
  return { type: 'expr', operator, vars };
}

/**
 * @param {string} template
 */
function parseURITemplate(template) {
  const end = template.length;
  let idx = 0;

  const parts = [];

  function pushLiteral(endIdx) {
    if (endIdx > idx) {
      parts.push({ type: 'literal', value: template.slice(idx, endIdx) });
    }
  }

  while (idx < end) {
    const exprStart = template.indexOf('{', idx);
    if (exprStart !== -1) {
      pushLiteral(exprStart);
      const exprEnd = template.indexOf('}', exprStart + 1);
      if (exprEnd === -1) {
        throw new SyntaxError('Expression without end');
      }
      parts.push(parseExpression(template.slice(exprStart + 1, exprEnd)));
      idx = exprEnd + 1;
    } else {
      pushLiteral(end);
      idx = end;
    }
  }
  return parts;
}

describe('parseURITemplate', () => {
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
