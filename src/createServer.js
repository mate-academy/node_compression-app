'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const formidable = require('formidable');

function createServer() {
  return http.createServer((req, res) => {
    if (req.url === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html' });

      res.end(`
        <form action="/compress" method="POST" enctype="multipart/form-data">
          <input type="file" name="file" required />
          <select name="compressionType" required>
            <option value="gzip">gzip</option>
            <option value="deflate">deflate</option>
            <option value="br">br</option>
          </select>
          <button type="submit">Compress</button>
        </form>
        `);
    } else if (req.url === '/compress' && req.method === 'POST') {
      const form = new formidable.IncomingForm();

      form.parse(req, (error, fields, files) => {
        if (error) {
          res.statusCode = 400;

          return res.end('Error parsing form');
        }

        const compressionType = String(fields.compressionType || '')
          .trim()
          .toLowerCase();

        const supported = ['gzip', 'deflate', 'br'];

        if (!supported.includes(compressionType)) {
          res.statusCode = 400;

          return res.end('Unsupported compression type');
        }

        const fileData = files.file?.[0];

        if (!fileData) {
          res.statusCode = 400;

          return res.end('Error parsing file');
        }

        const uploadedFile = files.file?.[0];
        const uploadedFilePath = uploadedFile?.filepath;

        const originalNameSafe = uploadedFile.originalFilename || 'file';

        if (!uploadedFilePath) {
          res.statusCode = 400;

          return res.end('File path not found');
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
            compressStream = zlib.createGzip();
            break;
        }

        const readStream = fs.createReadStream(uploadedFilePath);

        readStream.on('error', () => {
          res.statusCode = 500;
          res.end('Error reading file');
        });

        compressStream.on('error', () => {
          res.statusCode = 500;
          res.end('Error compressing file');
        });

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${originalNameSafe}.${compressionType}`,
        });

        readStream.pipe(compressStream).pipe(res);
      });
    } else if (req.url === '/compress') {
      res.statusCode = 400;

      return res.end('Only POST allowed on /compress');
    } else {
      res.statusCode = 404;

      return res.end('Not Found');
    }
  });
}

module.exports = {
  createServer,
};
