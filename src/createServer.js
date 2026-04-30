'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

function createServer() {
  /* Write your code here */
  // Return instance of http.Server class
  return http.createServer((req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const requestedPath = url.pathname.slice(1) || 'index.html';
    const realPath = path.join('public', requestedPath);
    console.log(`Requested path: ${requestedPath}`);

    if (!fs.existsSync(realPath)) {
      res.statusCode = 404;
      res.end('Not Found');

      return;
    }

    const mimeType = mime.contentType(path.extname(realPath)) || 'text/plain';
    const fileStream = fs.createReadStream(realPath);

    fileStream
      .on('error', () => {
        res.statusCode = 500;
        res.end('Internal Server Error');
      })
      .pipe(res)
      .on('error', () => {
        res.statusCode = 500;
        res.end('Internal Server Error');
      });

    res.on('close', () => {
      fileStream.destroy();
    });

    res.setHeader('Content-Type', mimeType);
    res.statusCode = 200;
  });
}

module.exports = {
  createServer,
};
