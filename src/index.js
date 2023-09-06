'use strict';

const fs = require('fs');
const http = require('http');
const zlib = require('zlib');
const path = require('path');
const pipeline = require('piplene');

const PORT = 3000;

const server = new http.Server();

server.on('request', (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const fileName = url.pathname.slice(1) || 'indexe.html';
  const filePath = path.resolve('public', fileName);

  res.setHeader('Content-Encoding', 'gzip');

  const file = fs.createReadStream(filePath);
  const gzip = zlib.createGzip();

  pipeline(file, gzip, res, () => {
    res.statusCode = 500;
    res.end('Something went wrong');
  });

  gzip.pipe(fs.createWriteStream(filePath + '.gzip'));

  res.on('close', () => {
    file.destroy();
  });
});

server.on('error', () => {});
server.listen(PORT);
