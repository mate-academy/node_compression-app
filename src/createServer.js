'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const Busboy = require('busboy');
const { pipeline } = require('stream');

function createServer() {
  const server = new http.Server();
  const typesCompress = ['gzip', 'deflate', 'br'];

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const indexName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('public', indexName);

    if (req.url === '/compress' && req.method === 'GET') {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('need POST method');

      return;
    }

    if (req.method === 'GET') {
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('file not found');

        return;
      }

      try {
        const file = fs.readFileSync(filePath);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(file);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('file not found');
      }

      return;
    }

    if (req.method === 'POST' && req.url === '/compress') {
      const busboy = new Busboy({ headers: req.headers });
      let compressType = null;
      let fileStream = null;
      let originalName = null;

      busboy.on('field', (fieldName, value) => {
        if (fieldName !== 'compressionType') {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('invalid form: field must be "compressionType"');

          return;
        }

        if (!typesCompress.includes(value)) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('invalid form: compression type not supported');

          return;
        }
        compressType = value;
      });

      busboy.on('file', (fieldName, stream, info) => {
        if (fieldName !== 'file') {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('invalid form: field must be "file"');
          stream.resume();

          return;
        }

        if (!info.filename) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('invalid form: no filename');
          stream.resume();

          return;
        }
        fileStream = stream;
        originalName = info.filename;
      });

      busboy.on('finish', () => {
        if (!fileStream) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('file missing');

          return;
        }

        if (!compressType) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('compressionType missing');

          return;
        }

        let transform;
        let ext;

        if (compressType === 'gzip') {
          transform = zlib.createGzip();
          ext = '.gz';
        } else if (compressType === 'deflate') {
          transform = zlib.createDeflate();
          ext = '.dfl';
        } else if (compressType === 'br') {
          transform = zlib.createBrotliCompress();
          ext = '.br';
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('invalid compression type');

          return;
        }

        const newName = path.basename(originalName) + ext;

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${newName}"`,
        });

        pipeline(fileStream, transform, res, (err) => {
          if (err) {
            console.error('Pipeline failed:', err);

            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
            }
            res.end('compression error');
          }
        });
      });

      req.pipe(busboy);

      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  return server;
}

module.exports = { createServer };
