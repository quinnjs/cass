#!/usr/bin/env node
'use strict';
const childProcess = require('child_process');
const path = require('path');
const PassThrough = require('stream').PassThrough;

const quinn = require('../lib/quinn');
const respond = require('../lib/respond');

const STDIO_SERVER_PATH = require.resolve('./stdio-server.js');
const HANDLER_PATH = process.argv[2];

function handle(req) {
  return new Promise((resolve, reject) => {
    const worker = childProcess.fork(STDIO_SERVER_PATH, [
      HANDLER_PATH,
      req.method,
      req.url,
      JSON.stringify(req.headers),
    ], {
      silent: true,
      execArgv: ['--harmony-async-await'],
    });

    const body = new PassThrough();
    worker.stderr.pipe(process.stderr);
    worker.stdout.pipe(body, { end: false });

    function sendEnd() {
      body.end();
    }

    worker.on('error', e => {
      reject(e);
      body.write(e.stack);
    });

    if (req.readable) {
      req.pipe(worker.stdin);
    } else {
      worker.stdin.end();
    }

    worker.on('message', ({ type, statusCode, headers }) => {
      switch (type) {
        case 'quinnjs:response':
          resolve(respond({ statusCode, headers, body }));
          break;

        case 'quinnjs:response-end':
          // Give it time to flush.
          setTimeout(sendEnd, 200);
          break;
      }
    });
    worker.on('exit', exitCode => {
      reject(new Error('Unexpected worker exit #' + exitCode));
      sendEnd();
    });
  });
}

const http = require('http');
const server = http
  .createServer(quinn(handle))
  .listen(process.env.PORT || 3000, () => {
    console.log('Listening');
  });
