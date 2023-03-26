/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const formidable = require('formidable');
const createCompressionStream = require('./createCompressionStream');
const { pipeline } = require('stream');

const server = new http.Server();

server.on('request', (req, res) => {
  switch (req.url) {
    case '/favicon.ico':
      res.end();

      return;

    case '/':
      const homePage = fs.createReadStream('src/public/index.html');

      homePage.pipe(res);
      res.on('close', () => homePage.destroy());

      return;

    case '/compress':
      if (req.method.toLowerCase() !== 'post') {
        res.statusCode = 400;
        res.end('Incorrect request data');

        return;
      };

      const form = formidable();

      form.parse(req, (err, { compression }, { file }) => {
        if (err) {
          res.statusCode = 500;
          res.end();

          return;
        }

        res.setHeader(
          'Content-disposition',
          `attachment; filename=${file.originalFilename}.zlib`
        );

        const fileStream = fs.createReadStream(file.filepath);
        const compressionStream = createCompressionStream(compression);

        pipeline(fileStream, compressionStream, res, () => {
          res.statusCode = 500;
          res.end();
        });

        res.on('close', () => {
          fileStream.destroy();
          compressionStream.destroy();
        });
      });

      return;

    default:
      res.statusCode = 404;
      res.end();
  }
});

server.on('error', () => {
  console.log('Oops, something went wrong');
});

module.exports = server;
