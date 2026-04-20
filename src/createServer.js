'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const formidable = require('formidable');
const compressionTypes = ['gzip', 'deflate', 'br'];

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/' && req.method === 'GET') {
      res.statusCode = 200;
      res.end('OK');

      return;
    }

    if (pathname !== '/compress') {
      res.statusCode = 404;
      res.end('Route do not exist');

      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 400;
      res.end('POST method requested');

      return;
    }

    if (pathname === '/compress' && req.method === 'POST') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, { compressionType }, { file }) => {
        if (err || !file || !compressionType) {
          res.statusCode = 400;
          res.end('File or compression not provided');

          return;
        }

        if (!compressionTypes.includes(compressionType[0])) {
          res.statusCode = 400;
          res.end('Unknown compression type');

          return;
        }

        let compression;

        switch (compressionType[0]) {
          case 'gzip':
            compression = zlib.createGzip();
            break;
          case 'deflate':
            compression = zlib.createDeflate();
            break;
          case 'br':
            compression = zlib.createBrotliCompress();
            break;
          default:
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Unckown type');

            return;
        }

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${file[0].originalFilename}.${compressionType}`,
        );

        const fileStream = fs.createReadStream(file[0].filepath);

        fileStream
          .on('error', (error) => {
            res.statusCode = 500;
            res.end('Failed to read file', error);
          })
          .pipe(compression)
          .on('error', (error) => {
            res.statusCode = 500;
            res.end('Failed to compress file', error);
          })
          .pipe(res)
          .on('finish', () => res.end());
      });
    }
  });

  return server;
}

module.exports = {
  createServer,
};
