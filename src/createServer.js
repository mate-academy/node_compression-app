'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream');
const multiparty = require('multiparty');

const SUPPORTED_TYPES = {
  gzip: { ext: '.gzip', method: zlib.createGzip },
  deflate: { ext: '.deflate', method: zlib.createDeflate },
  br: { ext: '.br', method: zlib.createBrotliCompress },
};

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/compress') {
      if (req.method !== 'POST') {
        res.writeHead(400);
        res.end('Use POST method');

        return;
      }

      const form = new multiparty.Form();

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.writeHead(400);
          res.end('Problem with form');

          return;
        }

        const compressionType = fields.compressionType?.[0];
        const file = files.file?.[0];

        if (!compressionType || !file) {
          res.writeHead(400);
          res.end('Incorrectly filled out form');

          return;
        }

        const compression = SUPPORTED_TYPES[compressionType];

        if (!compression) {
          res.writeHead(400);
          res.end('Wrong compression type');

          return;
        }

        const originalFilename = path.basename(file.originalFilename);
        const compressedFilename = originalFilename + compression.ext;

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${compressedFilename}`,
        });

        const source = fs.createReadStream(file.path);
        const compress = compression.method();

        pipeline(source, compress, res, (erro) => {
          fs.unlink(file.path, () => {});

          if (erro) {
            res.writeHead(400);
            res.end('Compression error');
          }
        });
      });

      return;
    }

    const fileName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('public', fileName);

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end('file not found');

      return;
    }

    const fileStream = fs.createReadStream(filePath);

    fileStream.pipe(res);

    fileStream.on('error', () => {
      res.statusCode = 500;
      res.end('server error');
    });

    res.on('close', () => fileStream.destroy());
  });

  return server;
}

module.exports = {
  createServer,
};
