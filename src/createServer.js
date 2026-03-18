'use strict';

const http = require('http');
const zlib = require('node:zlib');

function createServer() {
  /* Write your code here */
  const server = http.createServer((req, res) => {
    if (req.url === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('hello world');
    }

    if (req.url === '/compress') {
      if (req.method === 'GET') {
        res.statusCode = 400;

        return res.end('trouble');
      }

      let body = '';

      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        const filenameMatch = body.match(/filename="(.+?)"/);
        const filename = filenameMatch ? filenameMatch[1] : 'file';

        if (!filename || !body.includes('name="file"')) {
          res.statusCode = 400;

          return res.end();
        }

        const boundaryObj =
          req.headers['content-type'] &&
          req.headers['content-type'].match(/boundary=(.*)/);
        const boundary = boundaryObj ? boundaryObj[1] : '';
        const parts = body.split(`--${boundary}`);
        let fileContent = '';
        let compressionType = null;

        for (const part of parts) {
          if (part.includes('name="file"')) {
            const fileStart = part.indexOf('\r\n\r\n') + 4;

            fileContent = part.substring(fileStart, part.lastIndexOf('\r\n'));
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

        const { Readable } = require('stream');
        const fileStream = new Readable();

        fileStream.push(fileContent);
        fileStream.push(null);

        fileStream.pipe(compressor).pipe(res);
      });

      return;
    }

    if (req.method !== 'GET' || req.url !== '/') {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });

  // Return instance of http.Server class
  return server;
}

module.exports = {
  createServer,
};
