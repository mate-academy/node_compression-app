/* eslint-disable no-console */
('use strict');

const http = require('node:http');
const path = require('node:path');
const zlib = require('node:zlib');
const fs = require('node:fs');
const { pipeline } = require('node:stream');
const formidable = require('formidable');
const mime = require('mime-types');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const requestedPath = url.pathname.slice(1) || 'index.html';

    console.log(requestedPath);

    if (req.method.toLowerCase() === 'get') {
      if (requestedPath === 'compress') {
        res.statusCode = 400;
        res.end('GET method not allowed for /compress endpoint');

        return;
      }

      const filePathToReturn = path.join('src', requestedPath);

      console.log(filePathToReturn);

      if (!fs.existsSync(filePathToReturn)) {
        res.statusCode = 404;
        res.end('Not found');

        return;
      }

      const mimeType = mime.contentType(path.extname(filePathToReturn));
      const readStream = fs.createReadStream(filePathToReturn);
      const gzipStream = zlib.createGzip();

      res.statusCode = 200;
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Encoding', 'gzip');

      pipeline(readStream, gzipStream, res, (err) => {
        if (err) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      });

      res.on('close', () => {
        readStream.destroy();
      });
    } else if (
      req.method.toLowerCase() === 'post' &&
      requestedPath === 'compress'
    ) {
      const form = new formidable.IncomingForm();

      form.parse(req, (error, { compressionType }, { file }) => {
        if (error || !compressionType || !file) {
          res.statusCode = 400;
          res.end('form parsing error');

          return;
        }

        if (!Array.isArray(compressionType) || !Array.isArray(file)) {
          res.statusCode = 400;
          res.end('Invalid form data');

          return;
        }

        if (!['gzip', 'deflate', 'br'].includes(compressionType[0])) {
          res.statusCode = 400;
          res.end('Unknown compression type');

          return;
        }

        let compressor;

        switch (compressionType[0]) {
          case 'gzip':
            compressor = zlib.createGzip();
            break;
          case 'deflate':
            compressor = zlib.createDeflate();
            break;
          case 'br':
            compressor = zlib.createBrotliCompress();
            break;
          default:
            compressor = null;
        }

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${file[0].originalFilename}.${compressionType[0]}`,
        );

        const fileStream = fs.createReadStream(file[0].filepath);

        pipeline(fileStream, compressor, res, (err) => {
          if (err) {
            res.statusCode = 500;
            res.end(String(err));
          }
        });

        res.on('close', () => fileStream.destroy());
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  return server;
}

module.exports = {
  createServer,
};
