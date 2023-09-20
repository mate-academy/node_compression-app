/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const zlip = require('zlib');
const path = require('path');
const { pipeline } = require('stream');

const PORT = 8080;

const server = http.createServer((req, res) => {
  const normalized = new URL(req.url, `http://${req.headers.host}`);
  const fileName = normalized.pathname.slice(1) || 'index.html';
  const filePath = path.resolve('public', fileName);

  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.end('File not found');

    return;
  }

  const fileStream = fs.createReadStream(filePath);
  const brotli = zlip.createBrotliCompress();

  res.setHeader('Content-Encoding', 'br');
  res.setHeader('Content-type', 'text/plain');

  pipeline(fileStream, brotli, res, (error) => {
    if (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Something went wrong');
    }
  });

  res.on('close', () => {
    fileStream.destroy();
    brotli.destroy();
  });
});

server.on('error', (error) => {
  console.error(error);
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
