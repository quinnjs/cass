#!/usr/bin/env node
'use strict';
const http = require('http');
const path = require('path');

const quinn = require('../lib/quinn');

const handle = require(path.resolve(process.argv[2]));

http
  .createServer(quinn(handle))
  .listen(process.env.PORT || 3000, () => {
    console.log('Listening');
  });
