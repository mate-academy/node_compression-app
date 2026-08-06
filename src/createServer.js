/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const formidable = require('formidable');
const { pipeline } = require('stream');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const { pathname } = new URL(req.url || '', `http://${req.headers.host}`);

    if (pathname !== '/compress' && pathname !== '/') {
      res.statusCode = 404;
      res.end('Non-existent endpoint');

      return;
    }

    if (req.method === 'GET' && pathname === '/') {
      res.statusCode = 200;
      res.setHeader('Content-type', 'text/html');

      fs.readFile('./public/index.html', (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end('Not found');

          return;
        }

        res.end(data);
      });
    }

    if (req.method === 'GET' && pathname === '/compress') {
      res.statusCode = 400;
      res.end('Not Found');

      return;
    }

    if (req.method === 'POST' && pathname === '/compress') {
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

  server.on('error', (err) => {
    console.error('Server error: ', err.message);
  });

  return server;
}

module.exports = {
  createServer,
};
