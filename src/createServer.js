/* eslint-disable no-console */
'use strict';

const http = require('http');
const url = require('url');
const fs = require('fs');
const formidable = require('formidable');
const zlib = require('zlib');

function getGzip(type) {
  switch (type) {
    case 'gzip':
      return zlib.createGzip();

    case 'deflate':
      return zlib.createDeflate();

    case 'br':
      return zlib.createBrotliCompress();

    default:
      console.log('Invalid compression type');

      return false;
  }
}

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const { pathname } = new url.URL(req.url, `http://${req.headers.host}`);
    const fileName = pathname.slice(1) || 'index.html';

    const paths = ['/', '/compress'];

    if (!paths.includes(pathname)) {
      res.statusCode = 404;
      res.end('non-existent endpoint');
    }

    if (req.method === 'GET') {
      if (req.url === '/') {
        res.statusCode = 200;
        res.setHeader('Content-type', 'text/html');

        fs.readFile(`./public/${fileName}`, (err, data) => {
          if (err) {
            res.statusCode = 404;
            console.log(`${fileName} loading error: ${err} / page not found`);
          }

          res.end(data);
        });
      }

      if (req.url === '/compress') {
        res.statusCode = 400;
        res.end('Bad request');
      }
    }

    if (req.method === 'POST') {
      if (req.url === '/compress') {
        const form = new formidable.IncomingForm();

        form.parse(req, (err, fields, files) => {
          if (err) {
            res.statusCode = 400;

            return res.end('Error processing form data');
          }

          if (!files.file || !fields.compressionType) {
            res.statusCode = 400;

            return res.end('Missing file or compression type');
          }

          const file = files.file[0];
          const compressionType = fields.compressionType[0];

          const fileStream = fs.createReadStream(file.filepath);
          const gzip = getGzip(compressionType);

          if (!gzip) {
            res.statusCode = 400;

            return res.end(
              'Trying to compress a file with an unsupported compression type',
            );
          }

          const newFileName = `${file.originalFilename}.${compressionType}`;

          res.writeHead(200, {
            'Content-Disposition': `attachment; filename=${newFileName}`,
          });

          fileStream
            .on('error', (fileStreamError) => {
              console.error('Error reading file:', fileStreamError);
              res.statusCode = 500;
              res.end('Server error');
            })
            .pipe(gzip)
            .on('error', (gzipError) => {
              console.error('Error compressing file:', gzipError);
              res.statusCode = 400;
              res.end('Compress error');
            })
            .pipe(res);

          res.on('close', () => {
            console.log('Response closed');

            fileStream.destroy();
          });
        });
      }
    }
  });

  server.on('error', () => {
    console.log('something went wrong');
  });

  return server;
}

module.exports = {
  createServer,
};
