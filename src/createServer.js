'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const zlib = require('zlib');
const Busboy = require('busboy');

function createServer() {
  return http.createServer((req, res) => {
    const normalizedUrl = new URL(req.url || '', `http://${req.headers.host}`);
    const requestedPath = normalizedUrl.pathname.slice(1) || 'index.html';
    const realPath = path.join('public', requestedPath);

    if (requestedPath === 'compress') {
      if (req.method !== 'POST') {
        res.statusCode = 400;
        res.end('Bad Request');

        return;
      }

      const busboy = Busboy({ headers: req.headers });

      let compressionType = null;
      let fileHandled = false;

      busboy.on('field', (name, value) => {
        if (name === 'compressionType') {
          compressionType = value;
        }
      });

      busboy.on('file', (name, file, info) => {
        fileHandled = true;

        const fileName = info.filename;

        if (!compressionType) {
          res.statusCode = 400;
          res.end('Compression type is required');
          file.resume();

          return;
        }

        let compressStream;
        let ext;

        if (compressionType === 'gzip') {
          compressStream = zlib.createGzip();
          ext = '.gz';
        } else if (compressionType === 'deflate') {
          compressStream = zlib.createDeflate();
          ext = '.dfl';
        } else if (compressionType === 'br') {
          compressStream = zlib.createBrotliCompress();
          ext = '.br';
        } else {
          res.statusCode = 400;
          res.end('Unsupported compression type');
          file.resume();

          return;
        }

        const finalName = fileName + ext;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/octet-stream');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${finalName}"`,
        );

        file
          .pipe(compressStream)
          .on('error', () => {
            res.statusCode = 500;
            res.end('Internal Server Error');
          })
          .pipe(res);
      });

      busboy.on('finish', () => {
        if (!fileHandled && !res.headersSent) {
          res.statusCode = 400;
          res.end('File is required');
        }
      });

      req.pipe(busboy);

      return;
    }

    if (!fs.existsSync(realPath)) {
      res.statusCode = 404;
      res.end('Not Found');

      return;
    }

    const mimeType = mime.contentType(path.extname(realPath)) || 'text/plain';
    const fileStream = fs.createReadStream(realPath);

    res.statusCode = 200;
    res.setHeader('Content-Type', mimeType);

    fileStream
      .on('error', () => {
        res.statusCode = 500;
        res.end('Internal Server Error');
      })
      .pipe(res)
      .on('error', () => {
        res.statusCode = 500;
        res.end('Internal Server Error');
      });

    res.on('close', () => {
      fileStream.destroy();
    });
  });
}
module.exports = { createServer };
