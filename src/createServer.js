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

        const compressionType = String(fields.compressionType || '');

        const supported = ['gzip', 'deflate', 'br'];

        if (!supported.includes(compressionType)) {
          res.statusCode = 400;

          return res.end('Unsupported compression type');
        }

        const fileData = files.file;

        if (!fileData) {
          res.statusCode = 400;

          return res.end('Error parsing file');
        }

        const uploadedFilePath = files.file.filepath;
        const originalName = files.file.originalFilename;
        const originalNameSafe = originalName || 'file';

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
        }

        const extMap = { gzip: 'gz', deflate: 'dfl', br: 'br' };
        const ext = extMap[compressionType];

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${originalNameSafe}.${ext}`,
        });

        const readStream = fs.createReadStream(uploadedFilePath);

        readStream.on('error', () => {
          res.statusCode = 500;
          res.end('Error reading file');
        });

        compressStream.on('error', () => {
          res.statusCode = 500;
          res.end('Error compressing file');
        });

        readStream.pipe(compressStream).pipe(res);
      });
    } else if (req.url === '/compress') {
      if (req.method !== 'POST') {
        res.statusCode = 400;

        return res.end('GET not allowed on /compress');
      }
      res.statusCode = 404;

      return res.end('Not Found');
    } else {
      res.statusCode = 404;

      return res.end('Not Foound');
    }
  });
}

module.exports = {
  createServer,
};
