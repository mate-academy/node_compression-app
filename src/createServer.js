/* eslint-disable no-console */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const Busboy = require('busboy');
const { pipeline } = require('node:stream');
const { Writable } = require('node:stream');
const { Readable } = require('node:stream');

function createServer() {
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '', `http://${req.headers.host}`);
    const pathname = reqUrl.pathname;

    if (req.method === 'GET' && pathname === '/') {
      const indexPath = path.resolve('public', 'index.html');

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      fs.createReadStream(indexPath).pipe(res);

      return;
    }

    if (req.method === 'GET' && pathname === '/compress') {
      res.statusCode = 400;

      return res.end('Only POST method allowed for /compress');
    }

    if (req.method === 'POST' && pathname === '/compress') {
      const bb = Busboy({ headers: req.headers });

      let compressionType;
      let filename;
      const fileBuffer = [];

      bb.on('field', (name, val) => {
        if (name === 'compressionType') {
          compressionType = val;
        }
      });

      bb.on('file', (name, file, info) => {
        filename = info.filename;

        if (!filename) {
          file.resume();
          res.statusCode = 400;

          return res.end('Missing file');
        }

        const writable = new Writable({
          write(chunk, _, callback) {
            fileBuffer.push(chunk);
            callback();
          },
        });

        file.pipe(writable);
      });

      bb.on('finish', () => {
        if (!compressionType) {
          res.statusCode = 400;

          return res.end('Missing compression type');
        }

        if (!['gzip', 'deflate', 'br'].includes(compressionType)) {
          res.statusCode = 400;

          return res.end('Unsupported compression type');
        }

        if (!filename) {
          res.statusCode = 400;

          return res.end('Missing file');
        }

        const rawBuffer = Buffer.concat(fileBuffer);

        let compressor;

        switch (compressionType) {
          case 'gzip':
            compressor = zlib.createGzip();
            break;
          case 'deflate':
            compressor = zlib.createDeflate();
            break;
          case 'br':
            compressor = zlib.createBrotliCompress();
            break;
        }

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${filename}.${compressionType}`,
        });

        pipeline(Readable.from(rawBuffer), compressor, res, (err) => {
          if (err) {
            console.error('Compression failed', err);
            res.statusCode = 500;
            res.end('Compression failed');
          }
        });
      });

      req.pipe(bb);

      return;
    }

    res.statusCode = 404;
    res.end('Not found');
  });

  return server;
}

module.exports = {
  createServer,
};
