'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const zlib = require('zlib');

function createServer() {
  /* Write your code here */
  // Return instance of http.Server class
  return http.createServer((req, res) => {
    const normalizedUrl = new URL(req.url || '', `http://${req.headers.host}`);
    const requestedPath = normalizedUrl.pathname.slice(1) || 'index.html';
    const realPath = path.join('public', requestedPath);

    if (requestedPath === 'compress') {
      if (req.method !== 'POST') {
        res.statusCode = 400;
        res.end('Bad Request');

        return;
      }

      const chunks = [];

      req.on('data', (chunk) => {
        chunks.push(chunk);
      });

      req.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let fileName = buffer.toString().match(/filename="(.+?)"/);
        let type = buffer
          .toString()
          .match(/name="compressionType"\r\n\r\n(.*?)\r\n/);
        const headerEnd = buffer.indexOf('\r\n\r\n') + 4;
        const fileEnd = buffer.indexOf(Buffer.from('\r\n------'), headerEnd);
        const fileBuffer = buffer.slice(headerEnd, fileEnd);
        let compressed;
        let ext;

        if (!fileName) {
          res.statusCode = 400;
          res.end('Filename is required');

          return;
        } else if (!type) {
          res.statusCode = 400;
          res.end('Compression type is required');

          return;
        }
        fileName = fileName[1];
        type = type[1];

        if (type === 'gzip') {
          compressed = zlib.gzipSync(fileBuffer).on('error', () => {
            res.statusCode = 200;
            res.end('OK');
          });
          ext = '.gz';
        } else if (type === 'deflate') {
          compressed = zlib.deflateSync(fileBuffer).on('error', () => {
            res.statusCode = 200;
            res.end('OK');
          });
          ext = '.dfl';
        } else if (type === 'brotli') {
          compressed = zlib.brotliCompressSync(fileBuffer).on('error', () => {
            res.statusCode = 200;
            res.end('OK');
          });
          ext = '.br';
        } else {
          res.statusCode = 400;
          res.end('Unsupported compression type');

          return;
        }

        const finalName = fileName + ext;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/octet-stream');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${finalName}`,
        );

        res.end(compressed);
      });

      return;
    } else if (!fs.existsSync(realPath)) {
      res.statusCode = 404;
      res.end('Not Found');

      return;
    }

    const mimeType = mime.contentType(path.extname(realPath)) || 'text/plain';
    const fileStream = fs.createReadStream(realPath);

    fileStream
      .on('error', () => {
        res.statusCode = 500;
        res.end('Internal Server Error');
      })
      .pipe(res)
      .on('error', () => {
        res.statusCode = 500;
        res.end('Internal Server Error');
      });

    res.on('close', () => {
      fileStream.destroy();
    });

    res.setHeader('Content-Type', mimeType);
    res.statusCode = 200;
  });
}

module.exports = {
  createServer,
};
