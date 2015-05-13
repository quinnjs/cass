# Cass

> It rhymes with jax-rs.

A convenience layer to build JSON APIs using [`Quinn`](https://github.com/quinnjs/quinn).

```js
const cass = require('cass'),
      WebError = cass.WebError;

const handler = cass()(req => {
  if (req.method !== 'GET') throw new WebError(405);

  return {
    my: {
      response: { entity: true }
    }
  };
});

// handler can be passed into quinn's createApp
```

In combination with [`Wegweiser`](https://github.com/quinnjs/wegweiser):

```js
import { createServer } from 'http';

import cass from 'cass';
import { createRouter, GET, PUT } from 'wegweiser';
import parsedBody from 'parsed-body';
import { createApp } from 'quinn';

import db from './db'; // e.g. require('knex')(options)

const todos = db('todos');

const routes = [
  GET('/todos')(req => todos.select()),
  GET('/todos/:id')((req, id) => todos.first().where({ id })),
  PUT('/todos/:id')(async (req, id) => {
    const { done } = await parsedBody(req);
    if (0 === await todos.where({ id }).update({ done })) {
      return; // item not found
    }
    return todos.first().where({ id });
  })
];

// routes -> router
// router -> JSON responses
// JSON responses -> node style request listener
// node style request listener -> node http server
createServer(createApp(cass()(createRouter(routes))))
  .listen(3000);
```
