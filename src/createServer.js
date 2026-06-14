/* eslint-disable no-console */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { formidable } = require('formidable');
const zlib = require('node:zlib');
const { pipeline } = require('node:stream');

function createServer() {
  return http.createServer((req, res) => {
    if (req.url === '/compress' && req.method === 'GET') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });

      return res.end('Request shoul be Post method!');
    }

    if (req.url === '/' && req.method === 'GET') {
      const normalizePath = path.resolve(__dirname, '../public/index.html');
      const fileStream = fs.createReadStream(normalizePath);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      fileStream.pipe(res).on('error', (err) => console.error(err));
      res.on('close', () => fileStream.destroy());

      return;
    }

    if (req.method === 'POST' && req.url === '/compress') {
      const form = formidable({});
      const compressors = {
        gzip: zlib.createGzip,
        br: zlib.createBrotliCompress,
        deflate: zlib.createDeflate,
      };

      form.parse(req, (errors, { compressionType }, { file }) => {
        if (!compressionType || !file || errors) {
          res.statusCode = 400;

          return res.end('Form error!');
        }

        if (!compressors.hasOwnProperty([compressionType])) {
          res.statusCode = 400;

          return res.end('No such compression type!');
        }

        const files = file[0];
        const compressionTypes = compressionType[0];
        const fileStream = fs.createReadStream(files.filepath);
        const compression = compressors[compressionTypes]();

        res.writeHead(200, {
          'Content-Disposition': `attachment; filename=${files.originalFilename}.${compressionTypes}`,
        });

        pipeline(fileStream, compression, res, (err) => {
          if (err) {
            return err;
          }
        });
      });

      return;
    }

    res.statusCode = 404;
    res.end('Page not found!');
  });
}

module.exports = {
  createServer,
};
