'use strict';

const http = require('node:http');
const path = require('node:path');
const zlib = require('node:zlib');
const fs = require('node:fs');
const { pipeline } = require('node:stream');
const formidable = require('formidable');
const mime = require('mime-types');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const requestedPath = url.pathname.slice(1) || 'index.html';

    if (req.method === 'GET') {
      if (requestedPath === 'compress') {
        res.writeHead(400, { 'Content-Type': 'text/plain' });

        return res.end('GET method not allowed for /compress endpoint');
      }

      const filePath = path.join('src', requestedPath);

      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });

        return res.end('Not found');
      }

      const mimeType =
        mime.contentType(path.extname(filePath)) || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Encoding': 'gzip',
      });

      pipeline(fs.createReadStream(filePath), zlib.createGzip(), res, (err) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        }
      });
    } else if (req.method === 'POST' && requestedPath === 'compress') {
      const form = new formidable.IncomingForm();

      form.parse(req, (error, fields, files) => {
        if (error || !fields.compressionType || !files.file) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });

          return res.end('Invalid form data');
        }

        const compressionType = fields.compressionType[0];
        const file = files.file[0];
        const compressors = {
          gzip: zlib.createGzip,
          deflate: zlib.createDeflate,
          br: zlib.createBrotliCompress,
        };

        if (!compressors[compressionType]) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });

          return res.end('Unknown compression type');
        }

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${file.originalFilename}.${compressionType}`,
        );

        pipeline(
          fs.createReadStream(file.filepath),
          compressors[compressionType](),
          res,
          (err) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Internal Server Error');
            }
          },
        );
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
