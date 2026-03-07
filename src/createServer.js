'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { formidable } = require('formidable');

function createServer() {
  const server = http.createServer((req, res) => {
    // Handle root path - serve HTML file
    if (req.url === '/' && req.method === 'GET') {
      const htmlPath = path.join(__dirname, 'public', 'index.html');

      fs.readFile(htmlPath, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');

          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });

      return;
    }

    // Handle CSS file
    if (req.url === '/styles.css' && req.method === 'GET') {
      const cssPath = path.join(__dirname, 'public', 'styles.css');

      fs.readFile(cssPath, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');

          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/css' });
        res.end(data);
      });

      return;
    }

    // Handle /compress endpoint
    if (req.url === '/compress') {
      if (req.method !== 'POST') {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request: Only POST method is allowed');

        return;
      }

      const form = formidable({});

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad Request: Could not parse form data');

          return;
        }

        const compressionType = Array.isArray(fields.compressionType)
          ? fields.compressionType[0]
          : fields.compressionType;

        const file = Array.isArray(files.file) ? files.file[0] : files.file;

        if (!file) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad Request: No file provided');

          return;
        }

        if (!compressionType) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad Request: No compression type provided');

          return;
        }

        const validTypes = ['gzip', 'deflate', 'br'];

        if (!validTypes.includes(compressionType)) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad Request: Unsupported compression type');

          return;
        }

        const fileName = file.originalFilename;
        const compressedFileName = `${fileName}.${compressionType}`;

        let compressionStream;

        switch (compressionType) {
          case 'gzip':
            compressionStream = zlib.createGzip();
            break;

          case 'deflate':
            compressionStream = zlib.createDeflate();
            break;

          case 'br':
            compressionStream = zlib.createBrotliCompress();
            break;
        }

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${compressedFileName}`,
        });

        fs.createReadStream(file.filepath).pipe(compressionStream).pipe(res);
      });

      return;
    }

    // Handle 404 for all other routes
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  return server;
}

module.exports = {
  createServer,
};
