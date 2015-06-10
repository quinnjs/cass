'use strict';

const test = require('tape');

const nilo = require('nilo');
const GET = require('wegweiser').GET;

const cass = require('../');

const testQuinnHandler = require('./test-quinn-handler');

class EchoResource {
  constructor(reqHeaders) {
    this.reqHeaders = reqHeaders;
  }

  sendDate() {
    return this.reqHeaders;
  }
}
nilo.Inject('headers')(EchoResource);
GET('/date')(EchoResource.prototype.sendDate);

test('Support resource classes with @Inject', function(t) {
  t.plan(3);
  const dateHeader = new Date().toString();

  function verify(res) {
    t.equal(res.statusCode, 200, 'Returns 200');
    t.equal(res.bodyString, `{"Date":"${dateHeader}"}`, 'Correct body');
    t.equal(res.getHeader('content-type'), 'application/json; charset=utf-8', 'is json');
    t.end();
  }

  const app = cass(EchoResource);
  app.contextGraph.scan({
    getHeaders: nilo.Provides('headers')(nilo.Inject('request')(
      function(req) { return req.headers; }
    ))
  });
  testQuinnHandler(app, {
    method: 'GET',
    url: '/date',
    headers: { Date: dateHeader }
  }).then(verify, t.end);
});
