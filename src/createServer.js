'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const multiparty = require('multiparty');

const SUPPORTED_TYPES = ['gzip', 'deflate', 'br'];

function createCompressionStream(compressionType) {
  const compressionObj = {};

  switch (compressionType) {
    case 'gzip':
      compressionObj.stream = zlib.createGzip();
      compressionObj.type = 'gz';
      break;
    case 'deflate':
      compressionObj.stream = zlib.createDeflate();
      compressionObj.type = 'dfl';
      break;
    case 'br':
      compressionObj.stream = zlib.createBrotliCompress();
      compressionObj.type = 'br';
      break;
    default:
      return null;
  }

  return compressionObj;
}

function createServer() {
  /* Write your code here */
  // Return instance of http.Server class
  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      const fileStream = fs.createReadStream('src/public/index.html');

      fileStream.pipe(res);

      fileStream.on('error', () => {
        res.statusCode = 500;
        res.end('Server error');
      });

      res.on('close', () => fileStream.destroy());
    } else if (req.url === '/compress') {
      if (req.method !== 'POST') {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Bad request');

        return;
      }

      const form = new multiparty.Form();

      form.parse(req, (err, fields, files) => {
        res.setHeader('Content-Type', 'text/plain');

        if (err) {
          res.statusCode = 400;
          res.end('Invalid form');

          return;
        }

        if (!files.file || files.file.length === 0) {
          res.statusCode = 400;
          res.end('No file uploaded');

          return;
        }

        if (!fields.compressionType) {
          res.statusCode = 400;
          res.end('Missing compression type');

          return;
        }

        const compressionType = fields.compressionType.join('');
        const filePath = files.file[0].path;
        const filename = files.file[0].originalFilename;

        if (!SUPPORTED_TYPES.includes(compressionType)) {
          res.statusCode = 400;
          res.end('Unsupported compression type');

          return;
        }

        const fileStream = fs.createReadStream(filePath);
        const compressionStream = createCompressionStream(compressionType);

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${filename}.${compressionStream.type}`,
        });

        fileStream
          .pipe(compressionStream.stream)
          .on('error', () => {
            res.statusCode = 500;
            res.end('Server error');
          })
          .pipe(res);
      });
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Not found');
    }
  });

  return server;
}

module.exports = {
  createServer,
};
