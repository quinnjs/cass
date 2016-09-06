'use strict';
const respond = require('../../lib/respond');
const createRouter = require('../../lib/router');

module.exports = createRouter([
  ['GET /users/{id}{?show[]}', (req, params) => respond.json(params)],
]);
