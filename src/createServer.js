'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const busboy = require('busboy');

const data = `
  <form method="POST" action="/compress" enctype="multipart/form-data">
    <input type="file" name="file" required>
    <select name="compressionType" required>
      <option value="gzip">gzip</option>
      <option value="deflate">deflate</option>
      <option value="br">br</option>
    </select>
    <button type="submit">Compress</button>
  </form>
`;

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'GET') {
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      } else if (req.url === '/compress') {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Incorrect request');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Page not found');
      }

      return;
    }

    if (req.method === 'POST') {
      if (req.url === '/compress') {
        const bb = busboy({ headers: req.headers });

        bb.on('error', () => {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Form parsing error');
        });

        let filename = '';
        let type = '';
        let hasFile = false;
        let streamError = false;
        let tmpPath = '';
        let uploadDone = false;
        let fileWritten = false;
        let maybeResponded = false;

        const tryHandleRequest = () => {
          if (!uploadDone || !fileWritten || maybeResponded) {
            return;
          }

          if (streamError) {
            maybeResponded = true;
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Stream error');

            return;
          }

          if (!hasFile || !filename || !type) {
            maybeResponded = true;
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid form');

            if (tmpPath) {
              fs.unlink(tmpPath, () => {});
            }

            return;
          }

          let compressor = null;

          switch (type) {
            case 'gzip':
              compressor = zlib.createGzip();
              break;
            case 'deflate':
              compressor = zlib.createDeflate();
              break;
            case 'br':
              compressor = zlib.createBrotliCompress();
              break;
            default:
              maybeResponded = true;
              res.writeHead(400, { 'Content-Type': 'text/plain' });
              res.end('Unsupported type');

              fs.unlink(tmpPath, () => {});

              return;
          }

          maybeResponded = true;

          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename=${filename}.${type}`,
          });

          const fileStream = fs.createReadStream(tmpPath);
          const cleanup = () => {
            fs.unlink(tmpPath, () => {});
          };

          fileStream.on('error', (err) => {
            cleanup();
            res.destroy(err);
          });

          compressor.on('error', (err) => {
            cleanup();
            res.destroy(err);
          });

          res.on('close', cleanup);
          res.on('finish', cleanup);

          fileStream.pipe(compressor).pipe(res);
        };

        bb.on('file', (fieldname, file, info) => {
          hasFile = true;
          filename = info.filename;

          tmpPath = path.join(
            os.tmpdir(),
            `compression-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          );

          const writeStream = fs.createWriteStream(tmpPath);

          file.pipe(writeStream);

          writeStream.on('finish', () => {
            fileWritten = true;
            tryHandleRequest();
          });

          file.on('error', () => {
            streamError = true;
          });

          writeStream.on('error', () => {
            streamError = true;
          });
        });

        bb.on('field', (fieldname, val) => {
          if (fieldname === 'compressionType') {
            type = val;
          }
        });

        bb.on('finish', () => {
          uploadDone = true;

          if (!hasFile && !maybeResponded) {
            maybeResponded = true;
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid form');

            return;
          }

          tryHandleRequest();
        });

        req.pipe(bb);

        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Page not found');
    }
  });
}

module.exports = { createServer };
