/* eslint-disable no-console */
/* eslint-disable no-useless-return */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
// const zlib = require('zlib');

const VALID_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
};

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET') {
      if (url.pathname === '/compress') {
        res.statusCode = 400;
        res.end();

        return;
      }

      const fileName = url.pathname.slice(1) || 'index.html';
      const filePath = path.resolve('public', fileName);

      if (!fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.end('File not found');

        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = VALID_TYPES[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);

      const fileStream = fs.createReadStream(filePath);

      fileStream
        .on('error', (err) => {
          console.log(err);

          if (!res.headersSent) {
            res.statusCode = 500;
            res.end('Server error');

            return;
          }
        })
        .pipe(res);

      res.on('close', () => fileStream.destroy());

      return;
    }

    if (req.method === 'POST' && url.pathname === '/compress') {
    }
  });

  server.on('error', () => {});

  return server;
}

module.exports = {
  createServer,
};
