'use strict';

const http = require('http');
const fs = require('fs');
const formidable = require('formidable');
const zlib = require('zlib');
const { pipeline } = require('stream');

const server = new http.Server();

server.on('request', (req, res) => {
  const normalizedUrl = new URL(req.url, `http://${req.headers.host}`).pathname
    || '/index.html';

  if (normalizedUrl === '/index.html') {
    res.setHeader('Content-Type', 'text/html');

    const file = fs.createReadStream('public/index.html');

    file.on('error', () => {
      res.statusCode = 404;
      res.statusMessage = 'error has sprang';
      res.end('');
    });

    file.pipe(res);

    res.on('close', () => {
      file.destroy();
    });

    return;
  }

  if (normalizedUrl === '/index.css') {
    res.setHeader('Content-Type', 'text/css');

    const file = fs.createReadStream('public/index.css');

    file.pipe(res);

    file.on('error', () => {
      res.statusCode = 404;
      res.statusMessage = 'error has sprang';
      res.end('');
    });

    res.on('close', () => {
      file.destroy();
    });

    return;
  }

  if (normalizedUrl === '/compressFile') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 400;
        res.end('error has sprang!');
      }

      const file = files.file.filepath;
      const compressWith = fields.compression;
      const filename = files.file.originalFilename;
      const fileStream = fs.createReadStream(file);
      const contentType = files.file.mimetype;

      let chosenCompression;
      let encoding;

      switch (compressWith) {
        case 'Brotli':
          chosenCompression = zlib.createBrotliCompress();
          encoding = 'br';
          break;

        case 'Gzip':
          chosenCompression = zlib.createGzip();
          encoding = 'gzip';
          break;

        default:
          break;
      }

      res.setHeader('Content-Type', `${contentType}`);
      res.setHeader('Content-Encoding', `${encoding}`);

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );

      pipeline(fileStream, chosenCompression, res, (error) => {
        if (error) {
          res.statusCode = 500;
          res.statusMessage = 'error has sprang';
          res.end('');
        }
      });

      res.on('close', () => {
        fileStream.destroy();
      });
    });

    return;
  }

  res.statusCode = 404;
  res.end('invalid URL 404');
});

server.listen(3000);
