'use strict';

const http = require('http');
const fs = require('fs');
const formidable = require('formidable');
const zlib = require('zlib');

function createServer() {
  return new http.Server((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync('public/index.html'));
    } else if (req.method === 'POST' && req.url === '/compress') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, fields, files) => {
        if (!files.hasOwnProperty('file')
          || !fields.hasOwnProperty('compressionType')) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid form data');

          return;
        }

        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end();

          return;
        }

        const originalFileName = files.file[0].originalFilename;
        const compressionType = fields.compressionType[0];

        let compressedData;
        let postfix;
        const filepath = files.file[0].filepath;
        const fileStream = fs.createReadStream(filepath);

        switch (compressionType) {
          case 'gzip':
            compressedData = zlib
              .createGzip();
            postfix = 'gzip';
            break;
          case 'deflate':
            compressedData = zlib
              .createDeflate();
            postfix = 'deflate';
            break;
          case 'br':
            compressedData = zlib
              .createBrotliCompress();
            postfix = 'br';
            break;
          default:
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid compression type.');

            return;
        }

        fileStream.pipe(compressedData);

        const compressedFileName = `${originalFileName}.${postfix}`;

        res.writeHead(200, { 'Content-Disposition':
          `attachment; filename=${compressedFileName}` });
        compressedData.pipe(res);
      });
    } else if (req.method === 'GET' && req.url === '/compress') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end();
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end();
    }
  });
}

module.exports = {
  createServer,
};
