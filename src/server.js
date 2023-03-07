'use strict';

const http = require('http');
const fs = require('fs');
const { formidable } = require('formidable');
const { pipeline } = require('stream');
const compressionService = require('./compression.service');

const server = new http.Server();

server.on('request', (req, res) => {
  switch (req.url) {
    case '/':
      const homePage = fs.createReadStream('src/public/index.html');

      homePage.pipe(res);
      res.on('close', () => homePage.destroy());

      return;
    case '/compress':
      if (req.method.toLowerCase() !== 'post') {
        res.status = 400;
        res.end();

        return;
      }

      const form = formidable();

      form.parse(req, (err, { compression }, { file }) => {
        if (err) {
          res.status = 500;
          res.end();

          return;
        }

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${file.originalFilename}.zlib`
        );

        const fileStream = fs.createReadStream(file.filepath);
        const compressionStream = compressionService.createStream(compression);

        pipeline(fileStream, compressionStream, res, () => {
          res.status = 500;
          res.end();
        });

        res.on('close', () => {
          fileStream.destroy();
          compressionStream.destroy();
        });
      });

      return;
    default:
      res.status = 404;
      res.end();
  }
});

module.exports = { server };
