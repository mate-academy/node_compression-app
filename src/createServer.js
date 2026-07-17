/* eslint-disable no-console */
/* eslint-disable no-useless-return */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const BusBoy = require('busboy');
const zlib = require('zlib');

const VALID_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
};

const EXTENSIONS = {
  gzip: '.gz',
  deflate: '.dfl',
  br: '.br',
};

const COMPRESSORS = {
  gzip: zlib.createGzip,
  deflate: zlib.createDeflate,
  br: zlib.createBrotliCompress,
};

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET') {
      if (url.pathname === '/compress') {
        res.statusCode = 400;
        res.end();

        return;
      }

      const fileName = url.pathname.slice(1) || 'index.html';
      const filePath = path.resolve('public', fileName);

      if (!fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.end('File not found');

        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = VALID_TYPES[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);

      const fileStream = fs.createReadStream(filePath);

      fileStream
        .on('error', (err) => {
          console.log(err);

          if (!res.headersSent) {
            res.statusCode = 500;
            res.end('Server error');

            return;
          }
        })
        .pipe(res);

      res.on('close', () => fileStream.destroy());

      return;
    }

    if (req.method === 'POST' && url.pathname === '/compress') {
      const tempDir = path.resolve('temp');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const busboy = BusBoy({ headers: req.headers });

      let compressionType = null;
      let tempPath = null;
      let originalFilename = null;
      let hasFile = false;
      let fileWritePromise = null;

      busboy.on('field', (name, value) => {
        if (name === 'compressionType') {
          compressionType = value;
        }
      });

      busboy.on('file', (name, file, info) => {
        if (name !== 'file') {
          file.resume();

          return;
        }

        hasFile = true;

        const { filename } = info;

        originalFilename = filename;
        tempPath = path.join(tempDir, originalFilename);

        const writeStream = fs.createWriteStream(tempPath);

        file.pipe(writeStream);

        fileWritePromise = new Promise((resolve, reject) => {
          writeStream.on('finish', () => {
            resolve();
          });

          writeStream.on('error', (err) => {
            console.log('Recording error', err);
            reject(err);
          });
        });

        file.on('error', (err) => {
          console.error('Error reading input file:', err);
          writeStream.destroy();
        });
      });

      busboy.on('finish', async () => {
        if (!hasFile) {
          res.statusCode = 400;
          res.end('Bad Request: Missing file or invalid compression type');

          return;
        }

        if (!compressionType) {
          res.statusCode = 400;
          res.end('Invalid or missing compression type');

          return;
        }

        if (!COMPRESSORS[compressionType]) {
          res.statusCode = 400;
          res.end();

          return;
        }

        try {
          if (fileWritePromise) {
            await fileWritePromise;
          }

          const compressor = COMPRESSORS[compressionType]();
          const readStream = fs.createReadStream(tempPath);
          const outputFilename = originalFilename + EXTENSIONS[compressionType];

          res.setHeader('Content-Type', 'application/octet-stream');

          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${outputFilename}`,
          );

          readStream.pipe(compressor).pipe(res);

          console.log(
            `Request processed. Compression type selected.: ${compressionType}`,
          );

          res.on('finish', () => {
            readStream.destroy();

            fs.unlink(tempPath, (err) => {
              if (err) {
                console.error(`Failed to delete temp file: ${err.message}`);
              }
            });
          });
        } catch (err) {
          console.log('Critical error while saving', err);

          if (!res.headersSent) {
            res.statusCode = 500;
            res.end('Internal Server Error: Cannot save file');
          }
        }
      });

      req.pipe(busboy);
    }
  });

  server.on('error', () => {});

  return server;
}

module.exports = {
  createServer,
};
