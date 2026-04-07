'use strict';

const http = require('http');
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
          res.writeHead(400);
          res.end('Form parsing error');
        });

        let filename = '';
        let type = '';
        let hasFile = false;
        const chunks = [];
        let fileStreamError = false;

        bb.on('file', (fieldname, file, info) => {
          hasFile = true;
          filename = info.filename;

          file.on('data', (chunk) => {
            chunks.push(chunk);
          });

          file.on('error', () => {
            fileStreamError = true;
          });
        });

        bb.on('field', (fieldname, val) => {
          if (fieldname === 'compressionType') {
            type = val;
          }
        });

        bb.on('finish', () => {
          if (fileStreamError) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Stream error');

            return;
          }

          if (!hasFile || !filename || !type) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid form');

            return;
          }

          if (!['gzip', 'deflate', 'br'].includes(type)) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Unsupported type');

            return;
          }

          const rawFile = Buffer.concat(chunks);
          let compressedFile;

          switch (type) {
            case 'gzip':
              compressedFile = zlib.gzipSync(rawFile);
              break;
            case 'deflate':
              compressedFile = zlib.deflateSync(rawFile);
              break;
            case 'br':
              compressedFile = zlib.brotliCompressSync(rawFile);
              break;
          }

          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename=${filename}.${type}`,
          });
          res.end(compressedFile);
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
