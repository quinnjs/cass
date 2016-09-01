/*
 * Copyright (c) 2016, Jan Krems
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
'use strict';
function sendResponse(response, { statusCode, headers, body }) {
  response.statusCode = statusCode || 200;
  for (const [name, value] of headers) {
    response.setHeader(name, value);
  }
  if (!body) {
    response.end();
  } else if (typeof body === 'string' || Buffer.isBuffer(body)) {
    response.end(body);
  } else if (typeof body.pipe === 'function') {
    body.pipe(response);
  } else {
    throw new TypeError('Unsupported body type ' + typeof body);
  }
}

function sendFatal(response, error) {
  console.error(error);
  response.statusCode = 500;
  try {
    response.end('Fatal');
  } catch (endError) {
    console.error('Failed to end response', endError);
  }
}

function quinn(handle) {
  return function onRequest(request, response) {
    Promise.resolve(request)
      .then(handle)
      .then(sendResponse.bind(null, response))
      .catch(sendFatal.bind(null, response))
  };
}
module.exports = quinn;
