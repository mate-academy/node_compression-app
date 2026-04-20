'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const busboy = require('busboy');

// EXTENSIONS EXPECTED BY TESTS
const EXT_MAP = {
  gzip: 'gzip',
  deflate: 'deflate',
  br: 'br',
};

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'POST' && url.pathname === '/compress') {
      const bb = busboy({ headers: req.headers });

      let compressionType = null;
      let fileInfo = null;

      bb.on('field', (name, val) => {
        if (name === 'compressionType') {
          compressionType = val;

          if (fileInfo && !fileInfo.started) {
            fileInfo.start();
          }
        }
      });

      bb.on('file', (name, file, info) => {
        file.pause();

        fileInfo = {
          file,
          info,
          started: false,
          start() {
            if (this.started) {
              return;
            }
            this.started = true;

            if (!compressionType) {
              return;
            } // дочекаємося пізніше

            if (!EXT_MAP[compressionType]) {
              res.statusCode = 400;

              return res.end('Invalid compressionType');
            }

            const outName = `${info.filename}.${EXT_MAP[compressionType]}`;

            const compressor =
              compressionType === 'gzip'
                ? zlib.createGzip()
                : compressionType === 'deflate'
                  ? zlib.createDeflate()
                  : zlib.createBrotliCompress();

            res.statusCode = 200;

            res.setHeader(
              'Content-Disposition',
              `attachment; filename=${outName}`,
            );

            file.on('error', () => {
              if (!res.headersSent) {
                res.statusCode = 500;
              }
              res.end();
            });

            compressor.on('error', () => {
              if (!res.headersSent) {
                res.statusCode = 500;
              }
              res.end();
            });

            file.resume();
            file.pipe(compressor).pipe(res);
          },
        };

        if (compressionType) {
          fileInfo.start();
        }
      });

      bb.on('finish', () => {
        if (!fileInfo) {
          res.statusCode = 400;

          return res.end('No file');
        }

        if (!compressionType) {
          // прибираємо пайпи, якщо були
          fileInfo.file.unpipe();

          // дочитуємо файл до кінця, інакше busboy зависне
          fileInfo.file.resume();
          res.statusCode = 400;

          return res.end('Missing compressionType');
        }

        if (!fileInfo.started) {
          fileInfo.start();
        }
      });

      req.pipe(bb);

      return;
    }

    if (req.method === 'GET' && url.pathname === '/compress') {
      res.statusCode = 400;
      res.end();

      return;
    }

    const fileName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('public', fileName);

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;

      return res.end('file dont found');
    }

    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'text/plain');
    fs.createReadStream(filePath).pipe(res);
  });

  return server;
}

module.exports = {
  createServer,
};
