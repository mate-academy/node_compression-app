/* eslint-disable prettier/prettier */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const Busboy = require('busboy');
const zlib = require('zlib');
const { pipeline } = require('stream');

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      const filePath = path.join(__dirname, 'index.html');

      fs.readFile(filePath, (error, content) => {
        if (error) {
          res.statusCode = 500;

          return res.end('Server Error');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      });

      return;
    }

    if (req.method === 'GET' && req.url === '/compress') {
      res.statusCode = 400;

      return res.end('Bad Request: use POST');
    }

    if (req.method === 'POST' && req.url === '/compress') {
      const bb = Busboy({ headers: req.headers });
      let filename = '';
      let compressionType = '';
      const supportedTypes = {
        gzip: { fn: zlib.createGzip, ext: '.gz' },
        deflate: { fn: zlib.createDeflate, ext: '.dfl' },
        br: { fn: zlib.createBrotliCompress, ext: '.br' },
      };

      bb.on('field', (name, value) => {
        if (name === 'compressionType') {
          compressionType = value;
        }
      });

      bb.on('file', (name, file, info) => {
        filename = info.filename;

        if (name !== 'file') {
          res.statusCode = 400;

          return res.end('Bad Request: invalid form field');
        }

        if (!filename) {
          res.statusCode = 400;

          return res.end('Bad Request: no File');
        }

        if (!supportedTypes[compressionType]) {
          res.statusCode = 400;

          return res.end('Bad Request: unsupported compression type');
        }

        const { fn, ext } = supportedTypes[compressionType];
        const compressedName = filename + ext;

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${compressedName}"`,
        });
        // file.pipe(fn()).pipe(res);

        console.log(`file`, file);
        console.log('compressionType', compressionType);

        pipeline(file, fn(), res, (err) => {
          if (err) {
            res.statusCode = 500;
            res.end('Stream error');
          }
        });
      });
      req.pipe(bb);

      return;
    }
    res.statusCode = 404;
    res.end('Not Found Data');
  });
}

module.exports = {
  createServer,
};
