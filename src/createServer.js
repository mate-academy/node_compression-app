/* eslint-disable no-template-curly-in-string */
/* eslint-disable no-useless-return */
/* eslint-disable no-console */
/* eslint-disable handle-callback-err */
'use strict';

const { formidable } = require('formidable');
const http = require('http');
const fs = require('fs');
const zlib = require('zlib');

const extensions = {
  gzip: 'gz',
  deflate: 'dfl',
  br: 'br',
};

const compressors = {
  gzip: zlib.createGzip,
  deflate: zlib.createDeflate,
  br: zlib.createBrotliCompress,
};

function createServer() {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('');

      return;
    } else if (req.method === 'GET' && req.url === '/compress') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('');

      return;
    } else if (req.method === 'POST' && req.url === '/compress') {
      const form = formidable({});

      form.parse(req, (err, fields, files) => {
        if (!files.file) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('File not found');

          return;
        }

        if (!fields.compressionType) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Compression type does not exist');

          return;
        }

        if (!(fields.compressionType[0] in extensions)) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Unsupported compression type');

          return;
        }

        const compressionType = fields.compressionType[0];
        const fileName = files.file[0].originalFilename;

        res.writeHead(200, {
          'Content-Disposition': `attachment; filename=${fileName}.${extensions[compressionType]}`,
        });

        const readStream = fs.createReadStream(files.file[0].filepath);
        const compressStream = compressors[compressionType]();

        readStream.pipe(compressStream).pipe(res);
      });

      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('');
    }
  });

  return server;
}

module.exports = {
  createServer,
};
