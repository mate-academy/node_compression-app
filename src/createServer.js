/* eslint-disable no-useless-return */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const formidable = require('formidable');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/compress') {
      if (req.method === 'GET') {
        res.statusCode = 400;
        res.end('GET method not allowed for /compress');

        return;
      }

      if (req.method === 'POST') {
        const form = new formidable.IncomingForm();

        form.parse(req, (err, fields, files) => {
          if (err) {
            res.statusCode = 400;
            res.end('Invalid form data');

            return;
          }

          const file = files.file ? files.file[0] : null;
          const compressionType = fields.compressionType
            ? fields.compressionType[0]
            : null;

          if (!file || !compressionType) {
            res.statusCode = 400;
            res.end('Missing file or compression type');

            return;
          }

          const supportedTypes = {
            gzip: zlib.createGzip,
            deflate: zlib.createDeflate,
            br: zlib.createBrotliCompress,
          };

          if (!supportedTypes[compressionType]) {
            res.statusCode = 400;
            res.end('Unsupported compression type');

            return;
          }

          const originalFileName = file.originalFilename;
          const extensionMap = {
            gzip: 'gz',
            deflate: 'dfl',
            br: 'br',
          };

          const compressedFileName = `${originalFileName}.${extensionMap[compressionType]}`;

          res.statusCode = 200;

          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${compressedFileName}`,
          );

          const fileStream = fs.createReadStream(file.filepath);
          const compressionStream = supportedTypes[compressionType]();

          fileStream.on('error', () => {
            res.statusCode = 500;
            res.end('Server error');
          });

          compressionStream.on('error', () => {
            res.statusCode = 500;
            res.end('Compression error');
          });

          fileStream.pipe(compressionStream).pipe(res);

          res.on('close', () => {
            fileStream.destroy();
            compressionStream.destroy();
          });
        });

        return;
      }
    }

    const fileName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('src', fileName);

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end('File not found');

      return;
    }

    const fStream = fs.createReadStream(filePath);

    fStream.pipe(res);

    fStream.on('error', () => {
      res.statusCode = 500;
      res.end('Server error');
    });

    res.on('close', () => fStream.destroy());
  });

  server.on('error', () => {});

  return server;
}

module.exports = {
  createServer,
};
