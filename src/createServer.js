/* eslint-disable no-console */
'use strict';

const http = require('http');
const zlib = require('zlib');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const busboy = require('busboy');

function createServer() {
  const server = http.createServer();

  server.on('request', (req, res) => {
    console.log(`Request method: ${req.method}, URL: ${req.url}`);

    if (req.method === 'GET' && req.url === '/') {
      const filePath = path.resolve(__dirname, '../public', 'index.html');

      fs.readFile(filePath, (err, data) => {
        if (err) {
          console.error('Error loading form:', err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error loading form');

          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
    } else if (req.method === 'GET' && req.url === '/public/request.js') {
      const filePath = path.resolve(__dirname, '..', 'public', 'request.js');

      fs.readFile(filePath, (err, data) => {
        if (err) {
          console.error('Error loading script:', err);
          res.statusCode = 404;
          res.end('Not Found');

          return;
        }

        res.setHeader('Content-Type', 'text/javascript');
        res.end(data);
      });
    } else if (req.method === 'GET' && req.url === '/compress') {
      res.statusCode = 400;
      res.end('Method not allowed');
    } else if (req.method === 'POST' && req.url === '/compress') {
      const contentType = req.headers['content-type'];

      if (!contentType || !contentType.includes('multipart/form-data')) {
        res.statusCode = 400;
        res.end('Invalid or missing Content-Type');

        return;
      }

      let fileBuffer = null;
      let fileName = null;
      let compressionType = null;

      const bb = busboy({ headers: req.headers });

      bb.on('file', (name, file, info) => {
        const chunks = [];

        fileName = info.filename;

        file.on('data', (data) => {
          chunks.push(data);
        });

        file.on('end', () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });

      bb.on('field', (name, value) => {
        if (name === 'compressionType') {
          compressionType = value;
        }
      });

      bb.on('finish', () => {
        if (!fileBuffer || fileBuffer.length === 0) {
          res.statusCode = 400;
          res.end('No file provided');

          return;
        }

        if (!compressionType || !fileName) {
          res.statusCode = 400;
          res.end('Missing required fields');

          return;
        }

        let compressionStream;

        switch (compressionType) {
          case 'gzip':
            compressionStream = zlib.createGzip();
            break;
          case 'deflate':
            compressionStream = zlib.createDeflate();
            break;
          case 'br':
            compressionStream = zlib.createBrotliCompress();
            break;
          default:
            console.log(`Unsupported compression type: ${compressionType}`);
            res.statusCode = 400;
            res.end('Unsupported compression type');

            return;
        }

        const compressionExt = {
          gzip: '.gzip',
          deflate: '.deflate',
          br: '.br',
        }[compressionType];

        res.statusCode = 200;

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${fileName}${compressionExt}`,
        );
        res.setHeader('Content-Type', 'application/octet-stream');

        const fileStream = Readable.from(fileBuffer);

        fileStream
          .pipe(compressionStream)
          .pipe(res)
          .on('error', (err) => {
            console.error('Stream error:', err);
            res.statusCode = 500;
            res.end('Server error');
          });
      });

      req.pipe(bb);
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });

  return server;
}

module.exports = {
  createServer,
};
