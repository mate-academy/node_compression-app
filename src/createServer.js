'use strict';

const http = require('http');
const { formidable } = require('formidable');
const zlib = require('zlib');
const fs = require('fs');

function createServer() {
  /* Write your code here */
  // Return instance of http.Server class
  return http.createServer((req, res) => {
    if (req.url === '/') {
      res.statusCode = 200;
      res.end();
    } else if (req.url !== '/compress') {
      res.statusCode = 404;
      res.end();
    } else if (req.method === 'GET') {
      res.statusCode = 400;
      res.end();
    } else {
      const form = formidable();

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 400;
          res.end();

          return;
        }

        if (!files.file) {
          res.statusCode = 400;
          res.end();

          return;
        }

        if (!fields.compressionType) {
          res.statusCode = 400;
          res.end();

          return;
        }

        const compressionType = fields.compressionType[0];
        const fileName = files.file[0].originalFilename;
        const fileStream = fs.createReadStream(files.file[0].filepath);

        const validTypes = ['gzip', 'deflate', 'br'];

        if (!validTypes.includes(compressionType)) {
          res.statusCode = 400;
          res.end();

          return;
        }

        const compressionMethods = {
          gzip: zlib.createGzip,
          deflate: zlib.createDeflate,
          br: zlib.createBrotliCompress,
        };

        const compress = compressionMethods[compressionType]();

        const extension = { gzip: '.gz', deflate: '.dfl', br: '.br' };

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${fileName}${extension[compressionType]}`,
        );

        fileStream.pipe(compress).pipe(res);
      });
    }
  });
}

module.exports = {
  createServer,
};
