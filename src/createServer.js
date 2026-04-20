'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      const filePath = path.join(__dirname, 'index.html');

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.statusCode = 500;
          res.end('Error loading HTML file');

          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });

      return;
    }

    if (req.method === 'GET' && req.url === '/compress') {
      res.statusCode = 400;
      res.end('GET method not allowed for /compress');

      return;
    }

    if (req.method === 'POST' && req.url === '/compress') {
      const boundary = req.headers['content-type'].split('boundary=')[1];

      if (!boundary) {
        res.statusCode = 400;
        res.end('Invalid Form');

        return;
      }

      const chunks = [];

      req.on('data', (chunk) => chunks.push(chunk));

      req.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const parts = buffer.toString().split(`--${boundary}`);

        let fileName = '';
        let fileBuffer;
        let compressionType = '';

        for (const part of parts) {
          if (
            part.includes(
              'Content-Disposition: form-data; name="file"; filename="',
            )
          ) {
            const match = part.match(/filename="([^"]+)"/);

            if (match) {
              fileName = match[1];

              const fileContentIndex = part.indexOf('\r\n\r\n') + 4;

              fileBuffer = Buffer.from(
                part.slice(fileContentIndex, -2),
                'binary',
              );
            }
          }

          if (
            part.includes(
              'Content-Disposition: form-data; name="compressionType"',
            )
          ) {
            const match = part.match(/\r\n\r\n(\w+)\r\n/);

            if (match) {
              compressionType = match[1];
            }
          }
        }

        if (!fileName || !fileBuffer || !compressionType) {
          res.statusCode = 400;
          res.end('Invalid Form');

          return;
        }

        const validCompressionTypes = ['gzip', 'deflate', 'br'];

        if (!validCompressionTypes.includes(compressionType)) {
          res.statusCode = 400;
          res.end('Unsupported Compression Type');

          return;
        }

        const compressionMap = {
          gzip: zlib.createGzip(),
          deflate: zlib.createDeflate(),
          br: zlib.createBrotliCompress(),
        };

        const compressedFileName = `${fileName}.${compressionType === 'gzip' ? 'gzip' : compressionType === 'deflate' ? 'deflate' : 'br'}`;

        const compressedStream = compressionMap[compressionType];
        const compressedChunks = [];

        compressedStream.on('data', (chunk) => compressedChunks.push(chunk));

        compressedStream.on('end', () => {
          const compressedBuffer = Buffer.concat(compressedChunks);

          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename=${compressedFileName}`,
          });
          res.end(compressedBuffer);
        });

        compressedStream.on('error', () => {
          res.statusCode = 500;
          res.end('Compression Error');
        });

        compressedStream.end(fileBuffer);
      });

      req.on('error', () => {
        res.statusCode = 400;
        res.end('Invalid Form');
      });

      return;
    }

    res.statusCode = 404;
    res.end('Not Found');
  });
}

module.exports = {
  createServer,
};
