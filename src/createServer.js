'use strict';

const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

function createServer() {
  return http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'POST' && pathname === '/compress') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, { compressionType }, { file }) => {
        if (err) {
          res.statusCode = 400;

          return res.end('Invalid form data');
        }

        if (!file || !compressionType) {
          res.statusCode = 400;

          return res.end('File and compression type are required');
        }

        const compressionMethods = {
          gzip: zlib.createGzip,
          deflate: zlib.createDeflate,
          br: zlib.createBrotliCompress,
        };

        const compress = compressionMethods[compressionType];

        if (!compress) {
          res.statusCode = 400;

          return res.end('Unsupported compression type');
        }

        const compressedFileName = `${file[0].originalFilename}.${compressionType[0]}`;

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${compressedFileName}`,
        );

        const fileStream = fs.createReadStream(file[0].filepath);

        fileStream
          .on('error', (error) => {
            res.statusCode = 500;
            res.end(String(error));
          })
          .pipe(compress())
          .on('error', (error) => {
            res.statusCode = 500;
            res.end(String(error));
          })
          .pipe(res)
          .on('error', (error) => {
            res.end(String(error));
          });

        res.on('close', () => fileStream.destroy());
      });
    } else if (req.method === 'GET' && pathname === '/compress') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('GET method not supported for /compress endpoint');
    } else if (req.method === 'GET' && pathname === '/') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });
}

module.exports = {
  createServer,
};
