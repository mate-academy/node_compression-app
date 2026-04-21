'use strict';

/* eslint-disable no-console */

const { Server } = require('node:http');
const fs = require('node:fs');
const zlib = require('node:zlib');

const { formidable } = require('formidable');
const { pipeline } = require('node:stream');

function createServer() {
  const server = new Server();

  server.on('request', async (req, res) => {
    const path = req.url;
    const method = req.method;

    if (method === 'GET' && path === '/') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');

      const file = fs.createReadStream('public/index.html');

      file.on('error', () => {
        res.statusCode = 404;
        res.end('No such file');
      });

      file.on('close', () => {
        console.log('connection close');
        file.destroy();
      });
      file.pipe(res);
    } else if (method === 'POST' && path === '/compress') {
      const form = formidable({});

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 400;
          res.end();

          return;
        }

        if (!files.file?.[0] || !fields.compressionType?.[0]) {
          res.statusCode = 400;
          res.end();

          return;
        }

        const uploadedFilePath = files.file[0].filepath;
        const readStream = fs.createReadStream(uploadedFilePath);
        const compressionType = fields.compressionType[0];
        const fileName = files.file[0].originalFilename;

        let fileCompression;
        let extension = '';

        switch (compressionType) {
          case 'gzip':
            fileCompression = zlib.createGzip();
            extension = '.gz';

            break;
          case 'deflate':
            fileCompression = zlib.createDeflate();
            extension = '.dfl';

            break;
          case 'br':
            fileCompression = zlib.createBrotliCompress();
            extension = '.br';

            break;
          default:
            res.statusCode = 400;
            res.end();

            return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/octet-stream');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${fileName}${extension}`,
        );

        pipeline(readStream, fileCompression, res, (error) => {
          if (error) {
            res.end();
          }
        });
      });
    } else if (method === 'GET' && path === '/compress') {
      res.statusCode = 400;
      res.end();
    } else {
      res.statusCode = 404;
      res.end();
    }
  });

  return server;
}

module.exports = {
  createServer,
};
