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

        let compressionType = null;

        if (body.includes('gzip')) {
          compressionType = 'gzip';
        } else if (body.includes('deflate')) {
          compressionType = 'deflate';
        } else if (body.includes('br')) {
          compressionType = 'br';
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

        req.pipe(compressor).pipe(res);
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
