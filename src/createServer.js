'use strict';

const http = require('http');
const formidable = require('formidable');
const fs = require('fs');
const zlib = require('zlib');

function createServer() {
  return http.createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Compression server is running.');

      return;
    }

    // 404 for other routes
    if (req.url !== '/compress') {
      res.writeHead(404);
      res.end('Not Found');

      return;
    }

    // 400 for GET on /compress
    if (req.method !== 'POST') {
      res.writeHead(400);
      res.end('GET not allowed on /compress');

      return;
    }

    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(400);
        res.end('Invalid form data');

        return;
      }

      const file = Array.isArray(files.file) ? files.file[0] : files.file;

      const compressionType = Array.isArray(fields.compressionType)
        ? fields.compressionType[0]
        : fields.compressionType;

      if (!file || !file.filepath || !compressionType) {
        res.writeHead(400);
        res.end('Missing file or compressionType');

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
          res.writeHead(400);
          res.end('Unsupported compression type');

          return;
      }

      const originalFileName = file.originalFilename;
      const compressedFileName = originalFileName + extension;

      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
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
