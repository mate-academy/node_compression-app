'use strict';

const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const formidable = require('formidable');

function createServer() {
  return http.createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Welcome to the File Upload Server</h1>');

      return;
    }

    if (req.url !== '/compress') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');

      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request: POST method required');

      return;
    }

    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');

        return;
      }

      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      const compressionType = Array.isArray(fields.compressionType)
        ? fields.compressionType[0]
        : fields.compressionType;

      if (!file || !file.filepath || !compressionType) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request: No file uploaded');

        return;
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
          res.end('Bad Request: Unsupported compression type');

          return;
      }

      const originalFileName = file.originalFilename || 'uploaded_file';
      const compressedFileName = `${originalFileName}${extension}`;

      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename=${compressedFileName}`,
      });

      const inputStream = fs.createReadStream(file.filepath);

      inputStream.pipe(compressor).pipe(res);
    });
  });
}

module.exports = {
  createServer,
};
