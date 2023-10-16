'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const pipeline = require('pipeline');

function compression() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const fileName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('public', fileName);

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end('File not found');

      return;
    }

    const fileStream = fs.createReadStrem(filePath);

    switch (res.headers['content-encoding']) {
      case 'br':
        pipeline(fileStream, zlib.createBrotliCompress(), res, () => {});
        break;
      case 'gzip':
        pipeline(fileStream, zlib.createGzip(), res, () => {});
        break;
      case 'deflate':
        pipeline(fileStream, zlib.createDeflate(), res, () => {});
        break;
      default:
        pipeline(fileStream, zlib.createGzip(), res, () => {});
        break;
    }

    fileStream.on('error', (err) => {
      res.statusCode = 500;
      res.end(`Server error: ${err}`);
    });

    res.on('close', () => fileStream.destroy());
  });

  server.on('error', () => {});

  server.listen(3005);
}

module.exports = {
  compression,
};
