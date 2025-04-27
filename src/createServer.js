'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { IncomingForm } = require('formidable');

const COMPRESSION_TYPES = {
  gzip: {
    compress: zlib.createGzip,
    extension: 'gz',
  },
  deflate: {
    compress: zlib.createDeflate,
    extension: 'dfl',
  },
  br: {
    compress: zlib.createBrotliCompress,
    extension: 'br',
  },
};

function createServer() {
  return http.createServer((req, res) => {
    if (req.url === '/') {
      fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end('Server error');

          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      });

      return;
    }

    if (req.url === '/compress') {
      if (req.method !== 'POST') {
        res.writeHead(400);
        res.end('Bad Request');

        return;
      }

      const form = new IncomingForm();

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.writeHead(400);
          res.end('Form parsing error');

          return;
        }

        if (!files || !files.file) {
          res.writeHead(400);
          res.end('No file provided');

          return;
        }

        if (!fields || !fields.compressionType) {
          res.writeHead(400);
          res.end('No compression type provided');

          return;
        }

        const compressionType = fields.compressionType;

        if (!COMPRESSION_TYPES[compressionType]) {
          res.writeHead(400);
          res.end('Unsupported compression type');

          return;
        }

        const file = Array.isArray(files.file) ? files.file[0] : files.file;
        const fileStream = fs.createReadStream(file.filepath);
        const compressor = COMPRESSION_TYPES[compressionType].compress();

        const compressedFileName = `${file.originalFilename}.${COMPRESSION_TYPES[compressionType].extension}`;
        const headerFileName = `${file.originalFilename}.${compressionType}`;

        res.writeHead(200, {
          'Content-Disposition': `attachment; filename=${headerFileName}`,
          'Content-Type': 'application/octet-stream',
        });

        const outputStream = fs.createWriteStream(compressedFileName);

        fileStream
          .pipe(compressor)
          .pipe(outputStream)
          .on('finish', () => {
            fs.createReadStream(compressedFileName)
              .pipe(res)
              .on('error', () => {
                res.writeHead(500);
                res.end('Stream error');
              });
          })
          .on('error', () => {
            res.writeHead(500);
            res.end('Compression error');
          });
      });

      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });
}

module.exports = { createServer };
