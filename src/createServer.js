'use strict';

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { pipeline } = require('node:stream');
const formidable = require('formidable');
const zlib = require('node:zlib');
const mime = require('mime-types');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);

    const requestedPath = url.pathname.slice(1) || 'index.html';

    if (req.method === 'GET') {
      if (requestedPath === 'compress') {
        res.writeHead(400, { 'Content-Type': 'text/plain' });

        return res.end('GET method not allowed for compress');
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

          return res.end('Internal Server Error');
        }
      });
    } else if (req.method === 'POST' && requestedPath === 'compress') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, fields, files) => {
        if (err || !fields.compressionType || !files.file) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });

          return res.end('Invalid form data');
        }

        const file = files.file[0];
        const compressionType = fields.compressionType[0];

        let compressor;

        switch (compressionType) {
          case 'gzip':
            compressor = zlib.createGzip();
            break;
          case 'deflate':
            compressor = zlib.createDeflate();
            break;
          case 'br':
            compressor = zlib.createBrotliCompress();
            break;
          default:
            res.writeHead(400, { 'Content-Type': 'text/plain' });

            return res.end('Unsupported compression type');
        }

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${file.originalFilename}.${compressionType}`,
        );

        const fileStream = fs.createReadStream(file.filepath);

        pipeline(fileStream, compressor, res, (error) => {
          if (error) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
          }
        });
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
