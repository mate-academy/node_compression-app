'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable, pipeline } = require('stream');
const zlib = require('zlib');

const SUPPORTED_TYPES = ['gzip', 'deflate', 'br'];

const indexHtmlPath = path.join(__dirname, 'index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

function sendStatus(res, code) {
  if (!res.headersSent) {
    res.writeHead(code);
  }
  res.end();
}

function createServer() {
  return http.createServer((req, res) => {
    const { url, method } = req;

    if (method === 'GET' && url === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(indexHtml);

      return;
    }

    if (method === 'GET' && url === '/favicon.ico') {
      return sendStatus(res, 204);
    }

    if (method === 'GET' && url === '/compress') {
      return sendStatus(res, 400);
    }

    if (method === 'POST' && url === '/compress') {
      const contentType = req.headers['content-type'] || '';
      const boundaryMatch = contentType.match(/boundary=([^;]+)/i);

      if (!boundaryMatch) {
        return sendStatus(res, 400);
      }

      const boundary = '--' + boundaryMatch[1];
      let body = Buffer.alloc(0);

      req.on('data', (chunk) => {
        body = Buffer.concat([body, chunk]);
      });

      req.on('error', () => {
        return sendStatus(res, 400);
      });

      req.on('end', () => {
        const bodyStr = body.toString('binary');
        const parts = bodyStr.split(boundary).slice(1, -1);

        let fileBuffer = null;
        let filename = 'file';
        let compressionType = null;

        for (let part of parts) {
          part = part.trim();

          if (!part) {
            continue;
          }

          const [rawHeaders, rawBody] = part.split('\r\n\r\n');

          if (!rawBody) {
            continue;
          }

          const headers = rawHeaders;
          let content = rawBody;

          if (content.endsWith('\r\n')) {
            content = content.slice(0, -2);
          }

          if (headers.includes('name="compressionType"')) {
            compressionType = content.trim();
          }

          if (headers.includes('name="file"')) {
            const filenameMatch = headers.match(/filename="([^"]+)"/);

            if (filenameMatch) {
              filename = filenameMatch[1];
            }

            fileBuffer = Buffer.from(content, 'binary');
          }
        }

        if (!fileBuffer || !compressionType) {
          return sendStatus(res, 400);
        }

        if (!SUPPORTED_TYPES.includes(compressionType)) {
          return sendStatus(res, 400);
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
            return sendStatus(res, 400);
        }

        const outputName = `${filename}.${compressionType}`;

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${outputName}`,
        });

        const fileStream = Readable.from(fileBuffer);

        pipeline(fileStream, compressStream, res, (err) => {
          if (err) {
            if (!res.headersSent) {
              sendStatus(res, 500);
            } else {
              res.destroy(err);
            }
          }
        });
      });

      return;
    }

    return sendStatus(res, 404);
  });
}

module.exports = { createServer };
