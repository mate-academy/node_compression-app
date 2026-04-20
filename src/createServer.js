/* eslint-disable no-console */
'use strict';

const http = require('node:http');
const fs = require('fs');
const { createTransformer } = require('./services/createTransformer');
const formidable = require('formidable');
const { pipeline } = require('node:stream');

const OK = 200;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const availableCompressionTypes = ['gzip', 'deflate', 'br'];

function createServer() {
  return http.createServer(async(req, res) => {
    switch (req.url) {
      case '/':
      case '/index.html':
        res.writeHead(OK, { 'Content-Type': 'text/html' });

        fs.createReadStream('public/index.html')
          .pipe(res);

        break;

      case '/compress':
        if (req.method !== 'POST') {
          res.writeHead(BAD_REQUEST, { 'Content-Type': 'text/plain' });
          res.end('Wrong form method');

          return;
        }

        const form = new formidable.IncomingForm();

        form.parse(
          req,
          (err, { compressionType: compressionTypesArr }, { file: files }) => {
            if (err || !compressionTypesArr || !files) {
              res.writeHead(BAD_REQUEST, { 'Content-Type': 'text/plain' });
              res.end('Both file and compression type are required');

              return;
            }

            const [compressionType] = compressionTypesArr;
            const [file] = files;

            if (!availableCompressionTypes.includes(compressionType)) {
              res.writeHead(BAD_REQUEST, { 'Content-Type': 'text/plain' });
              res.end('Unsupported compression type');

              return;
            }

            const transformer = createTransformer(compressionType);

            res.setHeader(
              'Content-Disposition',
              `attachment; filename=${file.originalFilename}.${compressionType}`
            );

            pipeline(
              fs.createReadStream(file.filepath),
              transformer,
              res,
              (error) => {
                if (error) {
                  console.error('error -', error);
                }
              });
          });

        break;

      default:
        res.writeHead(NOT_FOUND, { 'Content-Type': 'text/plain' });
        res.end('Not found');
    }
  });
};

module.exports = {
  createServer,
};
