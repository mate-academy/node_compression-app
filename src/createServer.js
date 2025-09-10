'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream');

function createServer() {
  const server = new http.Server();

  server.on('request', async (req, res) => {
    if (req.method === 'GET') {
      if (req.url === '/' || req.url === '/index.html') {
        const filePath = path.join(__dirname, 'index.html');
        const stream = fs.createReadStream(filePath);

        res.on('close', () => {
          stream.destroy();
        });
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');

        stream.on('error', () => {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Internal Server Error');
        });
        stream.pipe(res);

        return;
      } else if (req.url === '/compress') {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain');
        res.end('GET method not allowed for /compress');

        return;
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Not Found');

        return;
      }
    }

    if (req.method === 'POST') {
      if (req.url === '/compress') {
        const contentType = req.headers['content-type'] || '';

        if (/^multipart\/form-data/i.test(contentType)) {
          const Busboy = require('busboy');
          const { PassThrough } = require('stream');

          let compressionType = null;
          let filename = null;
          let started = false;

          const busboy = Busboy({ headers: req.headers });
          let pass = null;

          const startPipelineIfReady = () => {
            if (started || !pass || !compressionType || !filename) {
              return;
            }

            if (!['gzip', 'deflate', 'br'].includes(compressionType)) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'text/plain');
              res.end('Invalid form data');
              started = true;

              return;
            }

            const transform =
              compressionType === 'gzip'
                ? zlib.createGzip()
                : compressionType === 'deflate'
                  ? zlib.createDeflate()
                  : zlib.createBrotliCompress();

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/octet-stream');

            res.setHeader(
              'Content-Disposition',
              `attachment; filename=${path.basename(filename)}.${compressionType}`,
            );

            started = true;

            pipeline(pass, transform, res, (err) => {
              if (err && !res.headersSent) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'text/plain');
                res.end('Compression error');
              }
            });
          };

          busboy.on('file', (field, fileStream, fileInfo) => {
            if (field !== 'file') {
              fileStream.resume();

              return;
            }

            filename =
              typeof fileInfo === 'string'
                ? fileInfo
                : fileInfo && fileInfo.filename;
            pass = new PassThrough();
            fileStream.pipe(pass);
            startPipelineIfReady();
          });

          busboy.on('field', (field, val) => {
            if (field === 'compressionType') {
              compressionType = (val || '').trim();
              startPipelineIfReady();
            }
          });

          busboy.on('finish', () => {
            if (!started) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'text/plain');
              res.end('Invalid form data');
            }
          });

          req.pipe(busboy);

          return;
        }

        if (/^application\/x-www-form-urlencoded/i.test(contentType)) {
          let body = '';

          req.on('data', (ch) => (body += ch));

          req.on('end', () => {
            const params = new URLSearchParams(body);
            const fileField = params.get('file');
            const compressionType = params.get('compressionType');

            if (
              !fileField ||
              !['gzip', 'deflate', 'br'].includes(compressionType || '')
            ) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'text/plain');
              res.end('Invalid form data');

              return;
            }

            const filePath = path.join(__dirname, fileField);
            const read = fs.createReadStream(filePath);
            const transform =
              compressionType === 'gzip'
                ? zlib.createGzip()
                : compressionType === 'deflate'
                  ? zlib.createDeflate()
                  : zlib.createBrotliCompress();

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/octet-stream');

            res.setHeader(
              'Content-Disposition',
              `attachment; filename=${path.basename(fileField)}.${compressionType}`,
            );

            pipeline(read, transform, res, (err) => {
              if (err && !res.headersSent) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'text/plain');
                res.end('Compression error');
              }
            });
          });

          return;
        }

        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Invalid form data');

        return;
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Not Found');

        return;
      }
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not Found');
  });

  server.on('error', () => {});

  return server;
}

module.exports = {
  createServer,
};
