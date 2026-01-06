'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable, Transform, pipeline } = require('stream');
const zlib = require('zlib');

const SUPPORTED_COMPRESSION_TYPES = ['gzip', 'deflate', 'br'];

function sendStatus(res, code) {
  if (!res.headersSent) {
    res.writeHead(code);
    res.end();
  }
}

function createServer() {
  const server = http.createServer((req, res) => {
    const { method, url } = req;

    if (method === 'GET' && url === '/') {
      const htmlPath = path.join(__dirname, 'index.html');

      const readStream = fs.createReadStream(htmlPath, 'utf8');

      res.writeHead(200, { 'Content-Type': 'text/html' });

      pipeline(readStream, res, (err) => {
        if (err) {
          sendStatus(res, 500);
        }
      });

      return;
    }

    // GET "/compress" -> 400
    if (method === 'GET' && url === '/compress') {
      sendStatus(res, 400);

      return;
    }

    if (method === 'POST' && url === '/compress') {
      const contentType = req.headers['content-type'] || '';
      const boundaryMatch = contentType.match(/boundary=([^;]+)/i);

      if (!boundaryMatch) {
        sendStatus(res, 400);

        return;
      }

      const boundary = `--${boundaryMatch[1]}`;
      const boundaryBuf = Buffer.from(boundary);
      const doubleNewline = Buffer.from('\r\n\r\n');

      let buffer = Buffer.alloc(0);
      let fileData = null;
      let compressionType = null;
      let filename = 'file';

      const MAX_BODY_SIZE = 20 * 1024 * 1024;

      const parser = new Transform({
        transform(chunk, encoding, callback) {
          buffer = Buffer.concat([buffer, chunk]);

          if (buffer.length > MAX_BODY_SIZE) {
            return callback(new Error('Body too large'));
          }

          callback();
        },

        flush(callback) {
          let searchIndex = 0;
          const parts = [];

          while (true) {
            const boundaryIndex = buffer.indexOf(boundaryBuf, searchIndex);

            if (boundaryIndex === -1) {
              break;
            }

            if (searchIndex > 0) {
              parts.push(buffer.slice(searchIndex, boundaryIndex));
            }

            searchIndex = boundaryIndex + boundaryBuf.length;
          }

          for (const part of parts) {
            const preview = part.toString(
              'utf8',
              0,
              Math.min(part.length, 200),
            );

            const headerEnd = part.indexOf(doubleNewline);

            if (headerEnd === -1) {
              continue;
            }

            const headersBuf = part.slice(0, headerEnd);
            const bodyStart = headerEnd + doubleNewline.length;
            let bodyEnd = part.length;

            if (
              bodyEnd >= 2 &&
              part[bodyEnd - 2] === 0x0d &&
              part[bodyEnd - 1] === 0x0a
            ) {
              bodyEnd -= 2;
            }

            const body = part.slice(bodyStart, bodyEnd);
            const headersStr = headersBuf.toString('utf8');

            if (preview.includes('name="file"')) {
              const filenameMatch = headersStr.match(/filename="([^"]+)"/);

              if (filenameMatch) {
                filename = filenameMatch[1];
              }

              fileData = body;
            }

            if (preview.includes('name="compressionType"')) {
              compressionType = body.toString('utf8').trim();
            }
          }

          callback();
        },
      });

      req
        .pipe(parser)
        .on('finish', () => {
          if (!fileData || !compressionType) {
            sendStatus(res, 400);

            return;
          }

          if (!SUPPORTED_COMPRESSION_TYPES.includes(compressionType)) {
            sendStatus(res, 400);

            return;
          }

          let compressStream;

          switch (compressionType) {
            case 'gzip':
              compressStream = zlib.createGzip();
              break;
            case 'deflate':
              compressStream = zlib.createDeflate();
              break;
            case 'br':
              compressStream = zlib.createBrotliCompress();
              break;
            default:
              sendStatus(res, 400);

              return;
          }

          const outputFilename = `${filename}.${compressionType}`;

          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename=${outputFilename}`,
          });

          const fileStream = Readable.from(fileData);

          pipeline(fileStream, compressStream, res, (err) => {
            if (err) {
              sendStatus(res, 500);
            }
          });
        })
        .on('error', () => {
          sendStatus(res, 400);
        });

      return;
    }

    // 404 для остальных
    sendStatus(res, 404);
  });

  return server;
}

module.exports = {
  createServer,
};
