'use strict';

const http = require('http');
const zlib = require('node:zlib');
const { Readable } = require('stream');

function createServer() {
  /* Write your code here */
  const server = http.createServer((req, res) => {
    if (req.url === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('hello world');

      return;
    }

    if (req.url === '/compress') {
      if (req.method !== 'POST') {
        res.statusCode = 400;

        return res.end('trouble');
      }

      const contentType = req.headers['content-type'] || '';
      const boundaryMatch = contentType.match(/boundary=(.*)/);

      if (!boundaryMatch) {
        res.statusCode = 400;

        return res.end();
      }

      const boundary = boundaryMatch[1];

      const chunks = [];

      req.on('data', (chunk) => {
        chunks.push(chunk);
      });

      req.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const body = buffer.toString('binary');

        const parts = body.split(`--${boundary}`);

        let fileContent = null;
        let filename = 'file';
        let compressionType = null;

        for (const part of parts) {
          if (part.includes('name="file"')) {
            const filenameMatch = part.match(/filename="(.+?)"/);

            if (filenameMatch) {
              filename = filenameMatch[1];
            }

            const fileStart = part.indexOf('\r\n\r\n') + 4;
            const fileEnd = part.lastIndexOf('\r\n');

            fileContent = Buffer.from(
              part.substring(fileStart, fileEnd),
              'binary',
            );
          } else if (part.includes('name="compressionType"')) {
            const valStart = part.indexOf('\r\n\r\n') + 4;
            const parsedType = part
              .substring(valStart, part.lastIndexOf('\r\n'))
              .trim();

            if (['gzip', 'deflate', 'br'].includes(parsedType)) {
              compressionType = parsedType;
            }
          }
        }

        if (fileContent === null || !filename) {
          res.statusCode = 400;

          return res.end();
        }

        if (!compressionType) {
          res.statusCode = 400;

          return res.end();
        }

        let compressor;
        let ext;

        if (compressionType === 'gzip') {
          compressor = zlib.createGzip();
          ext = '.gzip';
        } else if (compressionType === 'deflate') {
          compressor = zlib.createDeflate();
          ext = '.deflate';
        } else if (compressionType === 'br') {
          compressor = zlib.createBrotliCompress();
          ext = '.br';
        }

        res.statusCode = 200;

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${filename}${ext}`,
        );

        const fileStream = new Readable();

        fileStream.push(fileContent);
        fileStream.push(null);

        fileStream.pipe(compressor).pipe(res);
      });

      req.on('error', () => {
        res.statusCode = 500;
        res.end();
      });

      return;
    }

    res.statusCode = 404;
    res.end('Not Found');
  });

  return server;
}

module.exports = {
  createServer,
};
