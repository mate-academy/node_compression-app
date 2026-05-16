'use strict';

const zlib = require('node:zlib');
const http = require('http');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const { pipeline } = require('stream');

function createServer() {
  const compressors = {
    gzip: zlib.createGzip(),
    deflate: zlib.createDeflate(),
    br: zlib.createBrotliCompress(),
  };

  const form = new formidable.IncomingForm();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/compress' && req.method === 'POST') {
      form.parse(req, (err, { compressionType }, { file }) => {
        if (err || !compressionType || !file) {
          res.statusCode = 400;
          res.end('Invalid form data');

          return;
        }

        const compressionName = compressionType[0];

        if (!Object.keys(compressors).includes(compressionName)) {
          res.statusCode = 400;
          res.end('Invalid compression type');

          return;
        }

        const fileStream = fs.createReadStream(file[0].filepath);
        const errorHandler = (error) => {
          if (error) {
            res.statusCode = 400;
            res.end(error.message);
          }
        };

        res.statusCode = 200;

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${file[0].originalFilename}.${compressionName}`,
        );
        pipeline(fileStream, compressors[compressionName], res, errorHandler);
      });

      return;
    }

    if (url.pathname === '/compress' && req.method === 'GET') {
      res.statusCode = 400;
      res.end('GET method is not allowed');

      return;
    }

    if (url.pathname === '/') {
      const html = fs.createReadStream(path.resolve('src', 'index.html'));

      res.setHeader('Content-Type', 'text/html');
      html.pipe(res);

      return;
    }

    res.statusCode = 404;

    res.end('Bad request');
  });

  return server;
}

module.exports = {
  createServer,
};
