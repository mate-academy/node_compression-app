'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const zlib = require('zlib');

function createServer() {
  const server = new http.Server();
  const typesCompress = ['gzip', 'deflate', 'br'];

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const indexName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('public', indexName);

    if (req.url === '/compress' && req.method === 'GET') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/html');
      res.end('need post method');

      return;
    }

    if (!fs.existsSync(filePath) && req.method === 'GET') {
      res.statusCode = 404;
      res.end('file not found');

      return;
    }

    if (req.url === '/' && req.method === 'GET') {
      try {
        const file = fs.readFileSync(filePath);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(file);
      } catch {
        res.setHeader('Content-Type', 'text/html');
        res.statusCode = 404;
        res.end('file not  found');

        return;
      }
    }

    if (req.method === 'POST' && req.url === '/compress') {
      const chunks = [];

      req.on('data', (chunk) => {
        chunks.push(chunk);
      });

      req.on('end', () => {
        const file = Buffer.concat(chunks).toString();
        const contentType = req.headers['content-type'].split('boundary=')[1];
        const infoArray = file.split(`--${contentType}`);
        const clearArray = infoArray
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
          .toString();

        let fileName;
        let compressType;

        const filePartName = clearArray.split('filename=')[1];

        if (filePartName) {
          fileName = filePartName.split('\r\n')[0].replace(/"/g, '');
        }

        const compressTypePart = clearArray.split('compressionType')[1];

        if (compressTypePart) {
          compressType = compressTypePart
            .replace(/"/g, '')
            .split(',')[0]
            .trim();
        }

        if (!fileName) {
          res.statusCode = 400;
          res.end('invalid form');

          return;
        }

        if (!compressType || !typesCompress.includes(compressType)) {
          res.statusCode = 400;
          res.end('invalid form');

          return;
        }

        const biteFile = Buffer.concat(chunks);

        const boundary = Buffer.from(`--${contentType}`);
        const start = biteFile.indexOf(boundary) + boundary.length;
        const end = biteFile.indexOf(boundary, start);
        const filePart = biteFile.slice(start, end);
        const headerEnd = filePart.indexOf('\r\n\r\n');
        let fileBuffer = filePart.slice(headerEnd + 4);

        if (fileBuffer.slice(-2).toString() === '\r\n') {
          fileBuffer = fileBuffer.slice(0, -2);
        }

        const fileStream = Readable.from(fileBuffer);

        if (compressType === 'gzip') {
          const gzip = zlib.createGzip();
          const newFileName = fileName + '.gzip';
          const safeFileName = newFileName.replace(/[\r\n]/g, '').trim();

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/gzip');

          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${safeFileName}`,
          );
          fileStream.pipe(gzip);
          gzip.pipe(res);
        }

        if (compressType === 'deflate') {
          const deflate = zlib.createDeflate();
          const newFileName = fileName + '.deflate';

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/deflate');

          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${newFileName}`,
          );
          fileStream.pipe(deflate);
          deflate.pipe(res);
        }

        if (compressType === 'br') {
          const br = zlib.createBrotliCompress();
          const newFileName = fileName + '.br';

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/br');

          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${newFileName}`,
          );
          fileStream.pipe(br);
          br.pipe(res);
        }

        fileStream.on('error', () => {
          res.statusCode = 404;
          res.end('need file');
        });
      });
    }
  });

  return server;
}

module.exports = {
  createServer,
};
