'use strict';

const http = require('http');
const { formidable } = require('formidable');
const zlib = require('zlib');
const fs = require('fs');
const { pipeline } = require('stream');

const html = `
<form action="/compress" method="POST" encType="multipart/form-data">
  <input type="file" name="file">
    <select name="compressionType">
      <option value="gzip">gzip</option>
      <option value="deflate">deflate</option>
      <option value="br">br</option>
    </select>
  <button type="submit">compress</button>
</form>`;

const compressors = {
  gzip: { create: zlib.createGzip, ext: '.gz' },
  deflate: { create: zlib.createDeflate, ext: '.dfl' },
  br: { create: zlib.createBrotliCompress, ext: '.br' },
};

function createServer() {
  /* Write your code here */
  // Return instance of http.Server class
  return http.createServer((req, res) => {
    if (req.url === '/' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end(html);

      return;
    }

    if (req.url === '/compress' && req.method === 'GET') {
      res.statusCode = 400;
      res.end();

      return;
    }

    if (req.url === '/compress' && req.method === 'POST') {
      const form = formidable({});

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 400;
          res.end();

          return;
        }

        const compressionType = fields.compressionType?.[0];
        const file = files.file?.[0];

        if (!file || !compressionType) {
          res.statusCode = 400;
          res.end();

          return;
        }

        const compressor = compressors[compressionType];

        if (!compressor) {
          res.statusCode = 400;
          res.end();

          return;
        }

        const fileName = file.originalFilename + compressor.ext;

        res.statusCode = 200;

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${fileName}`,
        );

        pipeline(
          fs.createReadStream(file.filepath),
          compressor.create(),
          res,
          (error) => {
            if (error) {
              res.statusCode = 500;
              res.end();
            }
          },
        );
      });

      return;
    }

    res.statusCode = 404;
    res.end();
  });
}

module.exports = {
  createServer,
};
