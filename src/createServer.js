'use strict';

const { Server } = require('http');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const zlib = require('zlib');

function createServer() {
  const server = new Server((req, res) => {
    const method = req.method;
    const url = req.url;

    if (method === 'GET' && url === '/') {
      const filePath = path.join(__dirname, 'public', 'index.html');

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');

          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
    } else if (method === 'GET' && url === '/compress') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('GET method is not allowed for /compress');
    } else if (method === 'POST' && url === '/compress') {
      const form = new formidable.IncomingForm({ multiples: false });

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid form data');

          return;
        }

        const compressionType = fields.compressionType;
        const uploadedFile = files.file;

        if (
          !uploadedFile ||
          !(uploadedFile.filepath || uploadedFile.path) ||
          !compressionType
        ) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing file or compression type');

          return;
        }

        const filePath = uploadedFile.filepath || uploadedFile.path;

        let compressStream;
        let extension;

        switch (compressionType) {
          case 'gzip':
            compressStream = zlib.createGzip();
            extension = '.gz';
            break;
          case 'deflate':
            compressStream = zlib.createDeflate();
            extension = '.dfl';
            break;
          case 'br':
            compressStream = zlib.createBrotliCompress();
            extension = '.br';
            break;
          default:
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Unsupported compression type');

            return;
        }

        const originalName = uploadedFile.originalFilename || 'file.txt';
        const compressedName = originalName + extension;

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${compressedName}"`,
        });

        const readStream = fs.createReadStream(filePath);

        readStream.on('error', (error) => {
          // eslint-disable-next-line no-console
          console.error('ReadStream error:', error);

          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
          }
          res.end('Server error reading file');
        });

        compressStream.on('error', (error) => {
          // eslint-disable-next-line no-console
          console.error('CompressStream error:', error);

          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
          }
          res.end('Server error during compression');
        });

        readStream.pipe(compressStream).pipe(res);
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  return server;
}

module.exports = {
  createServer,
};
