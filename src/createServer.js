/* eslint-disable no-console */
'use strict';

const http = require('http');
const zlib = require('zlib');
const { Readable } = require('stream');
const multer = require('multer');

function getCompressionStream(compressionType) {
  switch (compressionType) {
    case 'gzip':
      return zlib.createGzip();
    case 'deflate':
      return zlib.createDeflate();
    case 'br':
      return zlib.createBrotliCompress();
    default:
      return null;
  }
};

function createServer() {
  const upload = multer().single('file');

  const server = http.createServer((req, res) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    if (pathname === '/' && req.method === 'GET') {
      res.statusCode = 200;
      res.end('Hello at home');

      return;
    }

    if (pathname !== '/compress') {
      res.statusCode = 404;
      res.end('non-existent endpoint');

      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Not Found');

      return;
    }

    upload(req, res, (err) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');

        return;
      }

      if (!req.file) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing file');

        return;
      }

      const compressionType = req.body.compressionType;
      const compressStream = getCompressionStream(compressionType);
      const fileBuffer = req.file.buffer;

      if (!compressStream) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing compressionType or file');

        return;
      }

      const fileName = req.file.originalname + '.' + compressionType;
      const readStream = new Readable();

      readStream.push(fileBuffer);
      readStream.push(null);

      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename=${fileName}`,
      });

      readStream.pipe(compressStream).pipe(res);
    });
  });

  return server;
}

module.exports = {
  createServer,
};
