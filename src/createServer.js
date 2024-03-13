/* eslint-disable no-console */
'use strict';

const http = require('http');
const formidable = require('formidable');
const fs = require('fs');
const zlib = require('zlib');

const compressionTypes = ['gzip', 'deflate', 'br'];

function getCompressedFile(compressionType) {
  switch (compressionType) {
    case 'gzip':
      return zlib.createGzip();
    case 'deflate':
      return zlib.createDeflate();
    case 'br':
      return zlib.createBrotliCompress();
    default:
      return null;
  }
}

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    const pathname = url.pathname;

    if (pathname === '/' && req.method === 'GET') {
      res.setHeader('content-type', 'plain/text');
      res.statusCode = 200;
      res.end();

      return;
    }

    if (pathname !== '/compress') {
      res.setHeader('content-type', 'plain/text');
      res.statusCode = 404;
      res.end('non-existent endpoint');

      return;
    }

    if (req.method !== 'POST') {
      res.setHeader('content-type', 'plain/text');
      res.statusCode = 400;
      res.end('Incorrect request method');

      return;
    }

    const form = new formidable.IncomingForm();

    form.parse(
      req,
      (err, { compressionType: compressionTypesArr }, { file: files }) => {
        if (err || !compressionTypesArr || !files) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Both file and compression type are required');

          return;
        }

        const [compressionType] = compressionTypesArr;
        const [file] = files;

        if (!compressionTypes.includes(compressionType)) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Unsupported compression type');

          return;
        }

        const compressed = getCompressedFile(compressionType);

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${file.originalFilename}.${compressionType}`,
        );

        const fileStream = fs.createReadStream(file.filepath);

        fileStream
          .on('error', (error) => console.log(error))
          .pipe(compressed)
          .on('error', (error) => console.log(error))
          .pipe(res)
          .on('error', (error) => console.log(error));

        res.on('close', () => fileStream.destroy());
      },
    );
  });

  return server;
}

module.exports = {
  createServer,
};
