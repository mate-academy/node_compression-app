'use strict';

const zlib = require('zlib');
const http = require('http');
const fs = require('fs');
const { pipeline, Readable } = require('stream');
const busboy = require('busboy');
const path = require('path');

const COMPRESSION_TRANSFORMS = {
  gzip: () => zlib.createGzip(),
  deflate: () => zlib.createDeflate(),
  br: () => zlib.createBrotliCompress(),
};

const EXTENSIONS = {
  gzip: 'gz',
  deflate: 'dfl',
  br: 'br',
};

function createServer() {
  return http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

    if (parsedUrl.pathname === '/' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');

      const stream = fs.createReadStream(
        path.resolve(__dirname, '..', 'index.html'),
      );

      pipeline(stream, res, (err) => {
        if (err) {
          res.statusCode = 500;
          res.end('Internal server error');
        }
      });

      return;
    }

    if (parsedUrl.pathname !== '/compress') {
      res.statusCode = 404;
      res.end('Not found');

      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 400;
      res.end('Use POST method instead');

      return;
    }

    const bb = busboy({ headers: req.headers });

    let originalFileName = null;
    let compressionType = null;
    const fileChunks = [];

    bb.on('field', (name, value) => {
      if (name === 'compressionType') {
        compressionType = value;
      }
    });

    bb.on('file', (name, file, info) => {
      if (name === 'file') {
        originalFileName = typeof info === 'object' ? info.filename : info;

        file.on('data', (chunk) => {
          fileChunks.push(chunk);
        });
      } else {
        file.resume();
      }
    });

    bb.on('close', () => {
      if (!originalFileName || !compressionType) {
        res.statusCode = 400;
        res.end('Invalid form request');

        return;
      }

      if (!Object.keys(COMPRESSION_TRANSFORMS).includes(compressionType)) {
        res.statusCode = 400;
        res.end('This compression type doesn`t support');

        return;
      }

      const fileName = `${originalFileName}.${EXTENSIONS[compressionType]}`;

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

      const compress = COMPRESSION_TRANSFORMS[compressionType]();

      const fileBuffer = Buffer.concat(fileChunks);
      const fileReadable = Readable.from(fileBuffer);

      pipeline(fileReadable, compress, res, (err) => {
        if (err) {
          res.statusCode = 500;
          res.end('Internal server error');
        }
      });
    });

    req.on('error', () => {
      res.statusCode = 400;
      res.end('Request error');
    });

    req.pipe(bb);
  });
}

module.exports = {
  createServer,
};
