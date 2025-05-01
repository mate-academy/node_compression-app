'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const zlib = require('zlib');

function createServer() {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      const filePath = path.join(__dirname, 'index.html');

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(500);

          return res.end('Server error');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
    } else if (req.method === 'GET' && req.url === '/compress') {
      res.writeHead(400);

      return res.end('GET not allowed on /compress');
    } else if (req.method === 'POST' && req.url !== '/compress') {
      res.writeHead(404);

      return res.end('Not Found');
    } else if (req.method === 'GET') {
      res.writeHead(404);

      return res.end('Not Found');
    } else if (req.method === 'POST' && req.url === '/compress') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.writeHead(400);

          return res.end('Invalid form');
        }

        const file = files.file;
        const compressionType = fields.compressionType;

        if (!file || !compressionType) {
          res.writeHead(400);

          return res.end('Missing file or compression type');
        }

        const inputStream = fs.createReadStream(file[0].filepath);

        let compressStream;
        let extension = '';

        switch (compressionType[0]) {
          case 'gzip':
            compressStream = zlib.createGzip();
            extension = '.gzip';
            break;

          case 'deflate':
            compressStream = zlib.createDeflate();
            extension = '.deflate';
            break;

          case 'br':
            compressStream = zlib.createBrotliCompress();
            extension = '.br';
            break;

          default:
            res.writeHead(400);

            return res.end('Unsupported compression type');
        }

        const originalName = file[0].originalFilename;
        const outputName = originalName + extension;

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${outputName}`,
        });

        inputStream.pipe(compressStream).pipe(res);
      });
    }
  });

  return server;
}

module.exports = {
  createServer,
};
