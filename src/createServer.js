'use strict';

const { Server } = require('http');
const fs = require('fs');
const { pipeline } = require('stream');
const zlib = require('zlib');

function createServer() {
  const server = new Server();

  server.on('request', (req, res) => {
    const realPath = new URL(req.url, `http://${req.headers.host}`);

    if (req.url !== '/compress' && req.url !== '/') {
      res.statusCode = 404;
      res.end('Not Found');

      return;
    }

    if (realPath.pathname === '/' && req.method === 'GET') {
      fs.createReadStream('./src/index.html').pipe(res);
    } else if (req.url === '/compress' && req.method === 'POST') {
      const boundary = req.headers['content-type']?.split('boundary=')[1];

      if (!boundary) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });

        return res.end('Invalid form data');
      }

      const chunks = [];

      req.on('data', (chunk) => chunks.push(chunk));

      req.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const parts = buffer.toString().split(`--${boundary}`);

        let fileBuffer = null;
        let fileName = null;
        let compressionType = null;

        for (const part of parts) {
          if (part.includes('Content-Disposition: form-data; name="file";')) {
            const headerEnd = part.indexOf('\r\n\r\n') + 4;

            fileBuffer = Buffer.from(
              part.slice(headerEnd, part.lastIndexOf('\r\n')),
            );

            const fileHeader = part.match(/filename="(.+?)"/);

            fileName = fileHeader ? fileHeader[1] : 'file';
          }

          if (
            part.includes(
              'Content-Disposition: form-data; name="compressionType"',
            )
          ) {
            compressionType = part.split('\r\n\r\n')[1].split('\r\n')[0].trim();
          }
        }

        if (!fileBuffer || !fileName || !compressionType) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });

          return res.end('Invalid form data');
        }

        let compressor;
        let extension;

        switch (compressionType) {
          case 'gzip':
            compressor = zlib.createGzip();
            extension = '.gzip';
            break;
          case 'deflate':
            compressor = zlib.createDeflate();
            extension = '.deflate';
            break;
          case 'br':
            compressor = zlib.createBrotliCompress();
            extension = '.br';
            break;
          default:
            res.writeHead(400, { 'Content-Type': 'text/plain' });

            return res.end('Unsupported compression type');
        }

        const compressedFileName = fileName + extension;

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${compressedFileName}`,
        });

        const fileStream = require('stream').Readable.from(fileBuffer);

        pipeline(fileStream, compressor, res, (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error compressing file');
          }
        });
      });
    } else {
      res.statusCode = 400;
      res.end('Bad request');
    }
  });

  return server;
}

module.exports = {
  createServer,
};
