'use strict';

const http = require('http');
const fs = require('fs/promises');
const busboy = require('busboy');
const zlib = require('zlib');
const { PassThrough } = require('stream');

function createServer() {
  const compressionTypeMap = {
    gzip: [zlib.createGzip, 'gz'],
    deflate: [zlib.createDeflate, 'dfl'],
    br: [zlib.createBrotliCompress, 'br'],
  };

  return http.createServer(async (req, res) => {
    if (req.method !== 'POST' && req.url === '/compress') {
      res.statusCode = 400;
      res.end();

      return;
    }

    if (req.method === 'GET' && req.url === '/') {
      try {
        const page = await fs.readFile('./public/index.html');

        res.end(page);

        return;
      } catch (err) {
        res.end('Something went wrong');

        return;
      }
    }

    if (req.method === 'POST' && req.url === '/compress') {
      const bb = busboy({ headers: req.headers });
      let compressionType = '';
      let filename;
      let hasFile = false;
      const pass = new PassThrough();

      bb.on('field', (name, val) => {
        if (name === 'compressionType') {
          compressionType = val;
        }
      });

      bb.on('file', (name, sourceFile, info) => {
        hasFile = true;
        filename = info.filename;
        sourceFile.pipe(pass);
      });

      bb.on('finish', () => {
        if (!hasFile) {
          res.statusCode = 400;
          res.end('No file provided');

          return;
        }

        if (!compressionTypeMap[compressionType]) {
          res.statusCode = 400;
          res.end('Invalid compression type');
          pass.destroy();

          return;
        }

        const [compressMethod, extension] = compressionTypeMap[compressionType];
        const compress = compressMethod();

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${filename}.${extension}`,
        );

        pass.pipe(compress);
        compress.pipe(res);
      });

      req.pipe(bb);

      return;
    }

    res.statusCode = 404;
    res.end('non-existing route');
  });
}

module.exports = {
  createServer,
};
