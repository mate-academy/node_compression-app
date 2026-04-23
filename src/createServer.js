'use strict';

const { Server } = require('http');
const zlib = require('zlib');
const fs = require('fs');
const { pipeline } = require('stream');
const formidable = require('formidable');

function createServer() {
  const server = new Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const requestedPath = url.pathname.slice(1) || 'index.html';

    if (url.pathname !== '/compress' && url.pathname !== '/') {
      res.statusCode = 404;
      res.end();

      return;
    }

    if (url.pathname === '/' && req.method === 'GET') {
      fs.readFile('public/index.html', (err, data) => {
        if (!err) {
          res.setHeader('Content-Type', 'text/html');
          res.statusCode = 200;
          res.end(data);

          return;
        }

        res.statusCode = 404;
        res.end();
      });

      return;
    }

    if (requestedPath !== '/compress' && req.method === 'GET') {
      res.statusCode = 400;
      res.end();

      return;
    }

    if (req.method === 'POST' && url.pathname === '/compress') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 400;
          res.end('Invalid form data');

          return;
        }

        if (!files.file || !fields.compressionType) {
          res.statusCode = 400;

          res.end('Missing file or compression type');

          return;
        }

        const file = files.file[0];
        const compressionType = fields.compressionType[0];
        const fileName = file.originalFilename + '.' + compressionType;

        if (!file || !compressionType) {
          res.statusCode = 400;

          res.end('Missing file or compression type');

          return;
        }

        const fileStream = fs.createReadStream(file.filepath);
        let compressedStream;

        switch (compressionType) {
          case 'gzip':
            compressedStream = zlib.createGzip();
            break;
          case 'deflate':
            compressedStream = zlib.createDeflate();
            break;
          case 'br':
            compressedStream = zlib.createBrotliCompress();
            break;
          default:
            res.statusCode = 400;
            res.end('Unsupported compression type');

            return;
        }

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${fileName}`,
        );

        pipeline(fileStream, compressedStream, res, (error) => {
          if (error) {
            res.statusCode = 500;
            res.end('Server error');
          }
        });

        res.on('close', () => fileStream.destroy());
      });
    }
  });

  return server;
}

module.exports = {
  createServer,
};
