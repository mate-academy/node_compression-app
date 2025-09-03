'use strict';
/* eslint-disable no-console */

const http = require('http');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { Readable, Stream } = require('stream');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const fileName = url.pathname.slice(1) || 'index.html';
    const filePath = path.join('src', fileName);

    console.log(url.pathname, req.method);

    if (req.method === 'GET') {
      if (url.pathname === '/compress') {
        res.statusCode = 400;
        res.end();

        return;
      }

      if (!fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.end('file not found');

        return;
      }

      const fileStream = fs.createReadStream(filePath);

      fileStream.pipe(res);
    }

    if (req.method === 'POST' && url.pathname === '/compress') {
      const chunks = [];

      req.on('data', (chunk) => {
        chunks.push(chunk);
      });

      req.on('end', () => {
        const body = Buffer.concat(chunks);
        const contentType = req.headers['content-type'];

        if (!contentType || !contentType.startsWith('multipart/form-data')) {
          res.statusCode = 400;

          return res.end('Invalid content type');
        }

        const boundary = '--' + contentType.split('boundary=')[1];
        const parts = body.toString().split(boundary);

        let filename, fileBuffer, compressionType;

        for (const part of parts) {
          if (part.includes('Content-Disposition')) {
            if (part.includes('name="compressionType"')) {
              compressionType = part
                .split('\r\n\r\n')[1]
                ?.split('\r\n')[0]
                ?.trim();
            }

            if (part.includes('name="file"')) {
              const match = part.match(/filename="(.+?)"/);

              if (match) {
                filename = match[1];
              }

              const fileContentIndex = part.indexOf('\r\n\r\n');

              if (fileContentIndex !== -1) {
                const fileContent = part.slice(
                  fileContentIndex + 4,
                  part.lastIndexOf('\r\n'),
                );

                fileBuffer = Buffer.from(fileContent, 'binary');
              }
            }
          }
        }

        if (!filename || !fileBuffer || fileBuffer.length === 0) {
          res.statusCode = 400;

          return res.end('No file provided');
        }

        if (!compressionType) {
          res.statusCode = 400;

          return res.end('No compression type provided');
        }

        let zipStream, ext;

        if (compressionType === 'br') {
          zipStream = zlib.createBrotliCompress();
          ext = '.br';
        } else if (compressionType === 'deflate') {
          zipStream = zlib.createDeflate();
          ext = '.deflate';
        } else if (compressionType === 'gzip') {
          zipStream = zlib.createGzip();
          ext = '.gzip';
        } else {
          res.statusCode = 400;

          return res.end('Unknown compression type');
        }

        const contentTypeFor = (contenttype) => {
          switch (contenttype) {
            case 'br':
              return 'application/x-brotli';
            case 'deflate':
              return 'application/octet-stream';
            default:
              return 'application/gzip';
          }
        };

        res.writeHead(200, {
          'Content-Disposition': `attachment; filename=${filename}${ext}`,
          'Content-Type': contentTypeFor(compressionType),
        });

        Stream.pipeline(Readable.from(fileBuffer), zipStream, res, (err) => {
          res.statusCode = 400;
          res.end(err);
        });
      });
    }
  });

  server.on('error', () => {});

  return server;
}

module.exports = {
  createServer,
};
