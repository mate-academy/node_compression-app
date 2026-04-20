'use strict';

const http = require('http');
const zlib = require('zlib');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

const compressionTypes = ['gzip', 'deflate', 'br'];

function handleCompressFile(compressionType) {
  switch (compressionType) {
    case 'gzip':
      return zlib.createGzip();
    case 'deflate':
      return zlib.createDeflate();
    case 'br':
      return zlib.createBrotliCompress();
    default:
      return null;
  }
}

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const form = new formidable.IncomingForm();
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/' && req.method === 'GET') {
      fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
        if (err) {
          res.statusCode = 500;
          res.end('Error loading the form');

          return;
        }

        res.setHeader('Content-Type', 'text/html');
        res.statusCode = 200;
        res.end(data);
      });

      return;
    }

    const ext = path.extname(pathname);
    const staticFiles = ['.css', '.js', '.png', '.jpg', '.gif'];

    if (staticFiles.includes(ext)) {
      const filePath = path.join(__dirname, pathname);

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end('File not found');

          return;
        }

        res.setHeader('Content-Type', getContentType(ext));
        res.statusCode = 200;
        res.end(data);
      });

      return;
    }

    if (pathname !== '/compress') {
      res.statusCode = 404;
      res.end('Trying to access a non-existing route');

      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 400;
      res.end('Use POST request method instead');

      return;
    }

    form.parse(req, (error, fields, files) => {
      if (error || !files.file || !fields.compressionType) {
        res.statusCode = 400;
        res.end('Bad request');

        return;
      }

      const [compressionType] = fields.compressionType;
      const [file] = files.file;

      if (!compressionTypes.includes(compressionType)) {
        res.statusCode = 400;
        res.end('Compression type not supported');

        return;
      }

      const compressedFile = handleCompressFile(compressionType);

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${file.originalFilename}.${compressionType}`,
      );

      const fileStream = fs.createReadStream(file.filepath);

      fileStream
        .on('error', (err) => {
          res.statusCode = 500;
          res.end('Failed to read file', err);
        })
        .pipe(compressedFile)
        .on('error', (err) => {
          res.statusCode = 500;
          res.end('Failed to compress file', err);
        })
        .pipe(res)
        .on('error', (err) => {
          // eslint-disable-next-line no-console
          console.error('Error sending response:', err);
        });

      res.on('close', () => fileStream.destroy());
    });
  });

  return server;
}

function getContentType(ext) {
  switch (ext) {
    case '.css':
      return 'text/css';
    case '.js':
      return 'application/javascript';
    case '.png':
      return 'image/png';
    case '.jpg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    default:
      return 'text/plain';
  }
}

module.exports = {
  createServer,
};
