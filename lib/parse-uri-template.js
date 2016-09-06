/*
 * Copyright (c) 2016, Jan Krems
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of the copyright holder nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
'use strict';
const OPERATORS = '+#./;?&=,!@|';

const VARCHAR = '(?:[A-Za-z_]|%[0-9A-Fa-f]{2})';
const VARNAME = `${VARCHAR}+(?:\\.${VARCHAR}+)*`;
const MODIFIER = '(?:(\\*)|(?::([1-9][0-9]{0,3}))|(\\[\\]))';
const VAR_SPEC = new RegExp(`^(${VARNAME})${MODIFIER}?$`);

function parseVarSpec(varSpec) {
  const match = varSpec.match(VAR_SPEC);
  if (!match) {
    throw new SyntaxError(`Invalid var-spec "${varSpec}"`);
  }
  const explode = !!match[2];
  const prefix = match[3] ? +match[3] : null;
  const list = !!match[4];
  return { type: 'var', name: match[1], explode, prefix, list };
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
  return { type: 'expr', source: expr, operator, vars };
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
module.exports = parseURITemplate;
