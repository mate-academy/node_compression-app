/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const formidable = require('formidable');

const compressionTypes = ['gzip', 'deflate', 'br'];

function getCompressedFile(compressionType) {
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
}

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/' && req.method === 'GET') {
      res.statusCode = 200;
      res.end('Ready');

      return;
    }

    if (pathname !== '/compress') {
      res.statusCode = 404;
      res.end('Trying to access a non-existing route ');

      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 400;
      res.end('Use POST request method instead');

      return;
    }

    const form = new formidable.IncomingForm();

    form.parse(req, (error, { compressionType: fields }, { file: files }) => {
      if (error || !fields || !files) {
        res.statusCode = 400;
        res.end('ERROR. Bad Request');

        return;
      }

      const [compressionType] = fields;
      const [file] = files;

      if (!compressionTypes.includes(compressionType)) {
        res.statusCode = 400;
        res.end('Bad Request: Compression type not supported');

        return;
      }

      const compressed = getCompressedFile(compressionType);

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${file.originalFilename}.${compressionType}`,
      );

      const fileStream = fs.createReadStream(file.filepath);

      fileStream
        .on('error', (err) => {
          res.statusCode = 500;
          res.end('Internal Server Error: Failed to read file', err);
        })
        .pipe(compressed)
        .on('error', (err) => {
          res.statusCode = 500;
          res.end('Internal Server Error: Failed to compress file', err);
        })
        .pipe(res)
        .on('error', (err) => {
          console.error('Error sending response:', err);
        });

      res.on('close', () => fileStream.destroy());
    });
  });

  return server;
}

module.exports = {
  createServer,
};
