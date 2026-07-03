'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pipeline } = require('stream/promises');
const zlib = require('zlib');
const busboy = require('busboy');

const filePath = path.join(__dirname, 'index.html');

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/compress') {
      res.statusCode = 400;

      return res.end('Wrong endpoint');
    }

    if (req.url !== '/' && req.url !== '/compress') {
      res.statusCode = 404;

      return res.end('Endpoint not exist');
    }

    if (req.method === 'POST' && req.url === '/compress') {
      const bb = busboy({ headers: req.headers });

      let compressionType = '';
      let hasFile = false;
      let uploadedFilePath = '';
      let fileInfo = null;

      bb.on('field', (name, value) => {
        if (name === 'compressionType') {
          compressionType = value;
        }
      });

      bb.on('file', (name, file, info) => {
        hasFile = true;
        fileInfo = info;

        uploadedFilePath = path.join(
          os.tmpdir(),
          `${Date.now()}-${info.filename}`,
        );

        const writeStream = fs.createWriteStream(uploadedFilePath);

        file.pipe(writeStream);
      });

      bb.on('close', async () => {
        if (!hasFile) {
          res.statusCode = 400;

          return res.end('Form is invalid');
        }

        const compressors = {
          gzip: {
            stream: zlib.createGzip(),
            extension: '.gz',
          },
          deflate: {
            stream: zlib.createDeflate(),
            extension: '.dfl',
          },
          br: {
            stream: zlib.createBrotliCompress(),
            extension: '.br',
          },
        };

        if (!compressionType) {
          res.statusCode = 400;

          return res.end('Form is invalid');
        }

        const compressor = compressors[compressionType];

        if (!compressor) {
          res.statusCode = 400;

          return res.end('Unsupported compression type');
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/octet-stream');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${fileInfo.filename}${compressor.extension}`,
        );

        try {
          await pipeline(
            fs.createReadStream(uploadedFilePath),
            compressor.stream,
            res,
          );

          fs.unlink(uploadedFilePath, () => {});
        } catch (err) {
          fs.unlink(uploadedFilePath, () => {});

          if (!res.headersSent) {
            res.statusCode = 500;
            res.end('Internal Server Error');
          }
        }
      });

      req.pipe(bb);

      return;
    }

    if (req.url === '/') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');

      fs.createReadStream(filePath).pipe(res);
    }
  });
}

module.exports = {
  createServer,
};
