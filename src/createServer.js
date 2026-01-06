'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { pipeline, Readable } = require('stream');
const zlib = require('zlib');

const COMPRESSION_TYPES = ['gzip', 'deflate', 'br'];

function sendStatus(res, code) {
  if (!res.headersSent) {
    res.writeHead(code);
    res.end();
  }
}

function createServer() {
  return http.createServer((req, res) => {
    const { url, method, headers } = req;

    if (url === '/' && method === 'GET') {
      const htmlPath = path.join(__dirname, 'index.html');
      const readStream = fs.createReadStream(htmlPath, 'utf-8');

      res.writeHead(200, { 'Content-Type': 'text/html' });

      pipeline(readStream, res, (err) => {
        if (err) {
          sendStatus(res, 500);
        }
      });

      return;
    }

    if (method === 'GET' && url === '/compress') {
      sendStatus(res, 400);

      return;
    }

    if (method === 'POST' && url === '/compress') {
      const contentType = headers['content-type'];

      if (!contentType || !contentType.includes('multipart/form-data')) {
        res.statusCode = 400;

        return;
      }

      const boundary = '--' + contentType.split('boundary=')[1];

      let body = Buffer.alloc(0);

      req.on('data', (chunk) => {
        body = Buffer.concat([body, chunk]);
      });

      req.on('end', () => {
        const parts = body.toString('binary').split(boundary);

        let fileBuffer;
        let fileName;
        let compressionType;

        for (const part of parts) {
          if (part.includes('name="compressionType"')) {
            compressionType = part.split('\r\n\r\n')[1]?.trim();
          }

          if (part.includes('name="file"')) {
            const match = part.match(/filename="(.+?)"/);

            if (match) {
              fileName = match[1];

              const fileContent = part.split('\r\n\r\n')[1];

              fileBuffer = Buffer.from(
                fileContent.slice(0, fileContent.lastIndexOf('\r\n')),
                'binary',
              );
            }
          }
        }

        if (!fileBuffer || !fileName || !compressionType) {
          return sendStatus(res, 400);
        }

        if (!COMPRESSION_TYPES.includes(compressionType)) {
          return sendStatus(res, 400);
        }

        let compressor;
        let extension;

        if (compressionType === 'gzip') {
          compressor = zlib.createGzip();
          extension = '.gzip';
        }

        if (compressionType === 'deflate') {
          compressor = zlib.createDeflate();
          extension = '.deflate';
        }

        if (compressionType === 'br') {
          compressor = zlib.createBrotliCompress();
          extension = '.br';
        }

        res.writeHead(200, {
          'Content-Disposition': `attachment; filename=${fileName}${extension}`,
          'Content-Type': 'application/octet-stream',
        });

        pipeline(Readable.from(fileBuffer), compressor, res, () => {});

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
