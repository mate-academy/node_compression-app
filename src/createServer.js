'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const busboy = require('busboy');
const { pipeline } = require('node:stream');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const baseUrl = req.url;

    if (baseUrl === '/') {
      const mainPath = path.resolve('public', 'index.html');

      const stream = fs.createReadStream(mainPath);

      res.setHeader('Content-Type', 'text/html');
      res.statusCode = 200;

      return stream.pipe(res);
    } else if (baseUrl === '/compress') {
      if (req.method !== 'POST') {
        res.statusCode = 400;

        return res.end();
      }

      const bb = busboy({ headers: req.headers });
      let fileName = null;
      let fileStream = null;
      let compresionType = null;
      let started = false;

      const tryStart = () => {
        if (started || !fileStream || !compresionType) {
          return;
        }

        started = true;

        let transformStream = null;

        switch (compresionType) {
          case 'gzip':
            transformStream = zlib.createGzip();
            break;
          case 'deflate':
            transformStream = zlib.createDeflate();
            break;
          case 'br':
            transformStream = zlib.createBrotliCompress();
            break;
          default:
            fileStream.resume();
            res.statusCode = 400;

            return res.end();
        }

        res.setHeader('Content-Type', 'application/octet-stream');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${fileName}.${compresionType}`,
        );
        res.statusCode = 200;

        pipeline(fileStream, transformStream, res, (err) => {
          if (err) {
            res.statusCode = 500;
          }
        });
      };

      bb.on('field', (name, value) => {
        if (name === 'compressionType') {
          compresionType = value;
        }

        tryStart();
      });

      bb.on('file', (name, stream, fileInfo) => {
        fileName = fileInfo.filename;
        fileStream = stream;

        tryStart();
      });

      bb.on('finish', () => {
        if (!started) {
          res.statusCode = 400;

          return res.end();
        }
      });

      req.pipe(bb);
    } else {
      res.statusCode = 404;

      return res.end();
    }
  });

  return server;
}

module.exports = { createServer };
