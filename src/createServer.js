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
      gzip: {
        extension: 'gz',
        createStream: () => zlib.createGzip(),
      },
      deflate: {
        extension: 'dfl',
        createStream: () => zlib.createDeflate(),
      },
      br: {
        extension: 'br',
        createStream: () => zlib.createBrotliCompress(),
      },
    };

    if (url.pathname === '/compress' && req.method === 'POST') {
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

        const compressionConfig = compressionMap[compressionType];

        if (!compressionConfig) {
          res.statusCode = 400;
          res.end('Unsupported compression type');

          return;
        }

        const readStream = fs.createReadStream(file.filepath);
        const compressStream = compressionConfig.createStream();
        const outputFileName = `${file.originalFilename}.${compressionConfig.extension}`;

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

    if (url.pathname === '/compress' && req.method === 'GET') {
      res.statusCode = 400;
      res.end('Wrong URL');

      return;
    }

    if (url.pathname === '/' && req.method === 'GET') {
      const fileStream = fs.createReadStream(realPath);
      const mimeType = mime.contentType(path.extname(realPath)) || 'text/plain';

      res.statusCode = 200;
      res.setHeader('Content-Type', mimeType);
      fileStream.pipe(res);

      return;
    }

    res.statusCode = 404;
    res.end('Not Found');
  });
}

module.exports = {
  createServer,
};
