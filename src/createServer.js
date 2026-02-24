'use strict';

const http = require('http');
const zlib = require('zlib');

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.statusCode = 200;
      res.end('OK');

      return;
    }

    if (req.url !== '/compress') {
      res.statusCode = 404;
      res.end();

      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 400;
      res.end();

      return;
    }

    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('multipart/form-data')) {
      res.statusCode = 400;
      res.end();

      return;
    }

    const boundary = '--' + contentType.split('boundary=')[1];

    const chunks = [];

    req.on('data', (chunk) => chunks.push(chunk));

    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('binary');

      const parts = body.split(boundary).filter((p) => p.trim());

      let fileBuffer = null;
      let filename = null;
      let compressionType = null;

      for (const part of parts) {
        if (part.includes('name="file"')) {
          const headerEnd = part.indexOf('\r\n\r\n');

          const headers = part.slice(0, headerEnd);
          const content = part.slice(headerEnd + 4, part.lastIndexOf('\r\n'));

          const match = headers.match(/filename="(.+?)"/);

          if (match) {
            filename = match[1];
          }

          fileBuffer = Buffer.from(content, 'binary');
        }

        if (part.includes('name="compressionType"')) {
          const headerEnd = part.indexOf('\r\n\r\n');

          const value = part
            .slice(headerEnd + 4)
            .replace(/\r\n$/, '')
            .trim();

          compressionType = value;
        }
      }

      const compressors = {
        gzip: zlib.gzipSync,
        deflate: zlib.deflateSync,
        br: zlib.brotliCompressSync,
      };

      if (!fileBuffer || !compressionType || !compressors[compressionType]) {
        res.statusCode = 400;
        res.end();

        return;
      }

      const compressed = compressors[compressionType](fileBuffer);

      res.statusCode = 200;

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${filename}.${compressionType}`,
      );

      res.end(compressed);
    });

    req.on('error', () => {
      res.statusCode = 500;
      res.end();
    });
  });
}

module.exports = { createServer };
