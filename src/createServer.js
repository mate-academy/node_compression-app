'use strict';

const http = require('node:http');
const fs = require('node:fs');
const formidable = require('formidable');
const zlib = require('zlib');
const path = require('node:path');

function createServer() {
  const server = new http.Server();
  const allowedTypes = ['gzip', 'deflate', 'br'];

  server.on('request', (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');

      const htmlPath = path.join(__dirname, 'index.html');

      fs.createReadStream(htmlPath).pipe(res);

      return;
    }

    if (req.method === 'POST' && req.url === '/compress') {
      const form = formidable({});

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 500;
          res.end('Server error');

          return;
        }

        const type = fields.compressionType ? fields.compressionType[0] : null;
        const file = files.file ? files.file[0] : null;

        if (!allowedTypes.includes(type)) {
          res.statusCode = 400;
          res.end('Unsupported type');

          return;
        }

        if (!file || !file.name || file.size === 0) {
          res.statusCode = 400;
          res.end('Invalid form');

          return;
        }

        const fileStream = fs.createReadStream(file.path);

        let compressor;

        switch (type) {
          case 'gzip':
            compressor = zlib.createGzip();
            break;
          case 'deflate':
            compressor = zlib.createDeflate();
            break;
          case 'br':
            compressor = zlib.createBrotliCompress();
            break;
        }

        const ext =
          type === 'gzip' ? '.gz' : type === 'deflate' ? '.dfl' : '.br';

        const filename = file.name + ext;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/octet-stream');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}"`,
        );

        fileStream.pipe(compressor).pipe(res);
      });
    } else if (req.method === 'GET' && req.url === '/compress') {
      res.statusCode = 400;
      res.end('Wrong request');
    } else if (req.url !== '/compress' && req.url !== '/') {
      res.statusCode = 404;
      res.end('Not found');
    }
  });

  return server;
}

module.exports = {
  createServer,
};
