/* eslint-disable no-console */
'use strict';

const http = require('http');

function createServer() {
  return http.createServer((req, res) => {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');

      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const name = url.searchParams.get('name');

    if (!name) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Name parameter is required');

      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });

    res.end(
      JSON.stringify({
        message: `Hello, ${name}!`,
      }),
    );
  });
}

module.exports = { createServer };
