/* eslint-disable no-console */
'use strict';

const formidable = require('formidable');
const http = require('http');
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

  server.on('request', async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathName = url.pathname;

    if (
      (pathName === '/' || pathName === '/index.html') &&
      req.method === 'GET'
    ) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');

      fs.createReadStream('public/index.html').pipe(res);

      return;
    }

    if (pathName !== '/compress') {
      res.setHeader('Content-type', 'plain/text');
      res.statusCode = 404;
      res.end('Non-existen endpoint');

      return;
    }

    if (req.method !== 'POST') {
      res.setHeader('Content-type', 'plain/text');
      res.statusCode = 400;
      res.end(`Don't try to do this! Use only POST`);

      return;
    }

    const form = new formidable.IncomingForm();

    try {
      const formData = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) {
            reject(err);

            return;
          }
          resolve({ fields, files });
        });
      });

      res.setHeader('Content-type', 'text/plain');

      const { compressionType: cType } = formData.fields;
      const { file: uploadedFile } = formData.files;

      if (!cType || !uploadedFile) {
        res.statusCode = 400;
        res.end('ERROR');

        return;
      }

      const compressionType = cType[0];
      const file = uploadedFile[0];

      if (!compressionTypes.includes(compressionType)) {
        res.statusCode = 400;
        res.end('ERROR: compression type not supported');

        return;
      }

      const compressed = getCompressedFile(compressionType);

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${file.originalFilename}.${compressionType}`,
      );

      const fileStream = fs.createReadStream(file.filepath);

      res.statusCode = 200;

      fileStream
        .on('error', (err) => console.log(err))
        .pipe(compressed)
        .on('error', (err) => console.log(err))
        .pipe(res)
        .on('error', (err) => console.log(err));

      res.on('close', () => fileStream.destroy());
    } catch (err) {
      res.statusCode = 500;
      res.end('Formidable error');
    }
  });

  server.on('error', () => {});

  return server;
}

module.exports = {
  createServer,
};
