'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const formidable = require('formidable');

function createServer() {
  const compressionTypes = {
    gzip: 'gzip',
    deflate: 'deflate',
    br: 'br',
  };

  const server = new http.Server();

  server.on('request', async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');

      const htmlPage = fs.createReadStream(
        path.resolve('src/public/', 'index.html'),
      );

      htmlPage.pipe(res);

      return;
    }

    if (url.pathname === '/compress' && req.method === 'GET') {
      res.statusCode = 400;
      res.end('Invalid method.');

      return;
    }

    if (url.pathname === '/compress' && req.method === 'POST') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 400;
          res.end('Invalid form data');

          return;
        }

        const compressionType = fields.compressionType;

        if (
          !compressionType ||
          !Object.keys(compressionTypes).includes(compressionType[0])
        ) {
          res.statusCode = 400;
          res.end('Invalid compression type');

          return;
        }

        let uploadedFile = files.file;

        if (!uploadedFile) {
          res.statusCode = 400;
          res.end('No file provided');

          return;
        }

        if (Array.isArray(uploadedFile)) {
          uploadedFile = uploadedFile[0];
        }

        const filePath = uploadedFile.filepath;
        const originalFileName = uploadedFile.originalFilename;

        if (!filePath || !fs.existsSync(filePath)) {
          res.statusCode = 400;
          res.end('Compression file not provided');

          return;
        }

        let compressionStream;
        let compressedExtension;

        switch (compressionType[0]) {
          case compressionTypes.gzip:
            compressionStream = zlib.createGzip();
            compressedExtension = '.gzip';
            break;
          case compressionTypes.deflate:
            compressionStream = zlib.createDeflate();
            compressedExtension = '.deflate';
            break;
          case compressionTypes.br:
            compressionStream = zlib.createBrotliCompress();
            compressedExtension = '.br';
            break;
          default:
            res.statusCode = 400;
            res.end('Invalid compression type');

            return;
        }

        res.statusCode = 200;

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${originalFileName}${compressedExtension}`,
        );

        const fileStream = fs.createReadStream(filePath);

        fileStream.pipe(compressionStream).pipe(res);

        compressionStream.pipe(
          fs.createWriteStream(filePath + compressedExtension),
        );

        res.statusCode = 200;

        res.on('close', () => {
          fileStream.destroy();
        });
      });

      return;
    }

    res.statusCode = 404;
    res.end('non-existing endpoint');
  });

  return server;
}

module.exports = {
  createServer,
};
