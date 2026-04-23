'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const zlib = require('zlib');
const { formidable } = require('formidable');
const { pipeline } = require('stream');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const requestedPath = url.pathname.slice(1) || 'index.html';

    if (requestedPath === 'compress' && req.method === 'GET') {
      res.writeHead(400, { 'content-type': 'text/plain' });
      res.end('Request should be POST method!');

      return;
    }

    if (requestedPath === 'compress' && req.method === 'POST') {
      const form = formidable({});

      const compressors = {
        gzip: zlib.createGzip,
        br: zlib.createBrotliCompress,
        deflate: zlib.createDeflate,
      };

      form.parse(req, (err, { compressionType }, { file }) => {
        if (err || !file || !compressionType) {
          res.statusCode = 400;
          res.end('Form error');

          return;
        }

        if (!compressors.hasOwnProperty(compressionType[0])) {
          res.statusCode = 400;
          res.end('No such compression type');

          return;
        }

        const uploadFile = file[0];
        const gzipStream = compressors[compressionType[0]]();
        const fileStream = fs.createReadStream(uploadFile.filepath);

        res.writeHead(200, {
          'content-disposition': `attachment; filename=${uploadFile.originalFilename}.${compressionType[0]}`,
        });

        pipeline(fileStream, gzipStream, res, (error) => {
          if (error) {
            res.statusCode = 500;
            res.end('Compression error');

            return;
          }

          res.end();
        });
      });

      return;
    }

    const realPath = path.join('public', requestedPath);

    if (!fs.existsSync(realPath)) {
      res.statusCode = 404;
      res.end('Not Found');

      return;
    }

    const contentStream = fs.createReadStream(realPath);
    const mimeType = mime.contentType(path.extname(realPath) || 'text/plain');

    res.statusCode = 200;
    res.setHeader('Content-type', mimeType);

    contentStream.on('data', (chunk) => {
      res.write(chunk);
    });

    contentStream.on('end', () => {
      res.end();
    });

    res.on('close', () => {
      contentStream.destroy();
    });

    contentStream.on('error', () => {
      res.statusCode = 500;
      res.end('Server error');
    });
  });

  return server;
}

module.exports = {
  createServer,
};
