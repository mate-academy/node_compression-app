'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const formidable = require('formidable');
const { pipeline } = require('stream');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    if (req.url === '/' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      fs.createReadStream('./public/index.html').pipe(res);

      return;
    }

    if (req.url === '/compress' && req.method !== 'POST') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');

      res.end('Requests to /compress need to be POST method');

      return;
    }

    if (req.url === '/compress' && req.method === 'POST') {
      const form = new formidable.IncomingForm({
        filename: (name, ext, part) => part.originalFilename,
      });

      form.parse(req, (err, { compressionType }, { file }) => {
        if (!file || !compressionType || err) {
          res.statusCode = 400;
          res.end('Form error');

          return;
        }

        const compressors = {
          gzip: zlib.createGzip,
          br: zlib.createBrotliCompress,
          deflate: zlib.createDeflate,
        };

        if (!Object.keys(compressors).includes(compressionType[0])) {
          res.statusCode = 400;
          res.end('Unsupported compression type');

          return;
        }

        const compressorType = compressors[compressionType[0]]();
        const fileStream = fs.createReadStream(file[0].filepath);

        res.statusCode = 200;

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${file[0].originalFilename}.${compressionType[0]}`,
        );

        pipeline(fileStream, compressorType, res, (error) => {
          if (error) {
            // eslint-disable-next-line no-console
            console.error('Pipeline failed', error);
          }
        });

        res.on('close', () => {
          compressorType.destroy();
        });
      });

      return;
    }

    res.statusCode = 404;
    res.end('Page not found');
  });

  // eslint-disable-next-line no-console
  server.on('error', (error) => console.log(error));

  return server;
}

module.exports = {
  createServer,
};
