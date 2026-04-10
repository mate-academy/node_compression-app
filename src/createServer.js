/* eslint-disable no-console */
'use strict';

const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const { pipeline } = require('stream');

function createServer() {
  return http.createServer((req, res) => {
    const urlNormalized = new URL(req.url, `http://${req.headers.host}`);
    const form = new formidable.IncomingForm();
    const compressors = {
      gzip: zlib.createGzip(),
      deflate: zlib.createDeflate(),
      br: zlib.createBrotliCompress(),
    };
    const errMessages = {
      formErr: 'Invalid form data',
      compressionErr: 'Unsupported compression type',
      methodErr: 'only POST method is not allowed',
      unknownPath: 'Bad request',
    };

    if (urlNormalized.pathname === '/compress' && req.method === 'POST') {
      form.parse(req, (error, { compressionType }, { file }) => {
        if (error || !compressionType || !file) {
          res.writeHead(400, { 'Content-type': 'text/plain' });

          return res.end(errMessages.formErr);
        }

        if (!Object.keys(compressors).includes(compressionType[0])) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });

          return res.end(errMessages.compressionErr);
        }

        const fStream = fs.createReadStream(file[0].filepath);

        res.writeHead(200, {
          'Content-Disposition': `attachment; filename=${file[0].originalFilename}.${compressionType}`,
        });

        pipeline(fStream, compressors[compressionType[0]], res, (err) => {
          if (err) {
            res.statusCode = 400;
            res.end(error.message);
          }
        });
      });

      return;
    }

    if (urlNormalized.pathname === '/compress' && req.method === 'GET') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });

      return res.end(errMessages.methodErr);
    }

    if (urlNormalized.pathname === '/') {
      const html = fs.createReadStream(path.resolve('src', 'index.html'));

      res.setHeader('Content-Type', 'text/html');
      html.pipe(res);

      return;
    }

    res.statusCode = 404;

    res.end(errMessages.unknownPath);
  });
}

module.exports = {
  createServer,
};
