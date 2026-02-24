'use strict';

const http = require('http');
const Busboy = require('busboy');
const zlib = require('zlib');

const compressionMap = {
  gzip: {
    stream: () => zlib.createGzip(),
    ext: 'gz',
  },
  deflate: {
    stream: () => zlib.createDeflate(),
    ext: 'dfl',
  },
  br: {
    stream: () => zlib.createBrotliCompress(),
    ext: 'br',
  },
};

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');

      return;
    }

    if (req.method !== 'POST' || req.url !== '/compress') {
      res.writeHead(req.method === 'GET' ? 404 : 400);
      res.end();

      return;
    }

    const busboy = Busboy({ headers: req.headers });

    let fileStream = null;
    let filename = null;
    let compressionType = null;
    let compressionStream = null;
    let responded = false;

    function tryStartPipe() {
      if (!fileStream || !compressionType || responded) {
        return;
      }

      const config = compressionMap[compressionType];

      if (!config) {
        responded = true;
        res.writeHead(400);
        res.end();

        return;
      }

      compressionStream = config.stream();

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${filename}.${config.ext}`,
      );

      fileStream
        .pipe(compressionStream)
        .pipe(res)
        .on('error', () => {
          if (!responded) {
            responded = true;
            res.writeHead(500);
            res.end();
          }
        });
    }

    busboy.on('file', (name, stream, info) => {
      if (name !== 'file') {
        stream.resume();

        return;
      }

      filename = info.filename;
      fileStream = stream;

      tryStartPipe();
    });

    busboy.on('field', (name, value) => {
      if (name === 'compressionType') {
        compressionType = value;
        tryStartPipe();
      }
    });

    busboy.on('finish', () => {
      if (!fileStream || !compressionType) {
        if (!responded) {
          responded = true;
          res.writeHead(400);
          res.end();
        }
      }
    });

    req.pipe(busboy);
  });
}

module.exports = { createServer };
