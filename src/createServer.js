/* eslint-disable no-console */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const mime = require('mime-types');
const zlib = require('node:zlib');
const { formidable } = require('formidable');

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const requestPath = url.pathname.slice(1) || 'index.html';
    const realPath = requestPath;

    const compressionMap = {
      gzip: () => zlib.createGzip(),
      deflate: () => zlib.createDeflate(),
      br: () => zlib.createBrotliCompress(),
    };

    if (req.url === '/compress' && req.method === 'POST') {
      const form = formidable({ multiples: false });

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 400;
          res.end('Invalid form');

          return;
        }

        const compressionType = Array.isArray(fields.compressionType)
          ? fields.compressionType[0]
          : fields.compressionType;

        const file = Array.isArray(files.file) ? files.file[0] : files.file;

        if (!file || !compressionType) {
          res.statusCode = 400;
          res.end('Invalid form');

          return;
        }

        const createCompressionStream = compressionMap[compressionType];

        if (!createCompressionStream) {
          res.statusCode = 400;
          res.end('Unsupported compression type');

          return;
        }

        const readStream = fs.createReadStream(file.filepath);
        const compressStream = createCompressionStream();
        const outputFileName = `${file.originalFilename}.${compressionType}`;

        res.statusCode = 200;

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${outputFileName}`,
        );

        readStream.on('error', () => {
          res.statusCode = 500;
          res.end('Server error');
        });

        compressStream.on('error', () => {
          res.statusCode = 500;
          res.end('Server error');
        });

        readStream.pipe(compressStream).pipe(res);
      });

      return;
    }

    if (req.url === '/compress' && req.method === 'GET') {
      res.statusCode = 400;
      res.end('Wrong URL');

      return;
    }

    if (req.url === '/' && req.method === 'GET') {
      const fileStream = fs.createReadStream(realPath);
      const mimeType = mime.contentType(path.extname(realPath)) || 'text/plain';

      res.statusCode = 200;
      res.setHeader('Content-Type', mimeType);
      fileStream.pipe(res);
    } else {
      if (!fs.existsSync(realPath)) {
        res.statusCode = 404;
        res.end('Not Found');
      }
    }
  });
}

module.exports = {
  createServer,
};
