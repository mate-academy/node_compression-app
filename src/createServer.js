'use strict';

const http = require('http');
const fs = require('fs');
const { pipeline } = require('stream');
const formidable = require('formidable');
const zlib = require('zlib');
const mime = require('mime-types');
const path = require('path');

function createServer() {
  const server = http.createServer();

  server.on('request', (req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const requestedPath = url.pathname.slice(1) || 'index.html';

    if (req.method === 'GET') {
      if (requestedPath === 'compress') {
        res.writeHead(400, {
          'Content-type': 'text/plain',
        });

        return res.end('GET method not allowed for compress');
      }

      const filePath = path.resolve(`public/${requestedPath}`);

      if (!fs.existsSync(filePath)) {
        res.writeHead(404, {
          'Content-type': 'text/plain',
        });

        return res.end('Not found');
      }

      const mimeType =
        mime.contentType(path.extname(filePath)) || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Encoding': 'gzip',
      });

      const flStream = fs.createReadStream(filePath);

      pipeline(flStream, zlib.createGzip(), res, (error) => {
        if (error) {
          res.writeHead(500, {
            'Content-Type': 'text/plain',
          });
          res.end('Server Error');
        }
      });
    } else if (req.method === 'POST' && requestedPath === 'compress') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, fields, files) => {
        if (err || !fields.compressionType || !files.file) {
          res.writeHead(400, {
            'Content-type': 'text/plain',
          });

          return res.end('Invalid form data');
        }

        const file = files.file[0];
        const compressionType = fields.compressionType[0];
        let selectedCompressor;

        switch (compressionType) {
          case 'gzip':
            selectedCompressor = zlib.createGzip();
            break;
          case 'deflate':
            selectedCompressor = zlib.createDeflate();
            break;
          case 'br':
            selectedCompressor = zlib.createBrotliCompress();
            break;
          default:
            res.writeHead(400, { 'Content-Type': 'text/plain' });

            return res.end('Unsupported compression type');
        }

        res.setHeader(
          'Content-Disposition',
          'attachment; filename=' +
            file.originalFilename +
            '.' +
            compressionType,
        );

        const fileStream = fs.createReadStream(file.filepath);

        pipeline(fileStream, selectedCompressor, res, (error) => {
          if (error) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Server Error');
          }
        });
      });
    } else {
      res.writeHead(404, {
        'Content-type': 'text/plain',
      });

      return res.end('Not found');
    }
  });

  return server;
}

module.exports = { createServer };
