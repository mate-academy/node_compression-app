'use strict';

const http = require('http');
const { Readable } = require('stream');
const { getCompression } = require('./getCompression');
const multer = require('multer');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathName = url.pathname;

    if (pathName === '/' && req.method === 'GET') {
      res.statusCode = 200;
      res.end('Trying send a GET request to / endpoint');

      return;
    };

    if (pathName !== '/compress') {
      res.statusCode = 404;
      res.end('Trying access a non-existent endpoint');

      return;
    };

    if (pathName === '/compress' && req.method === 'GET') {
      res.statusCode = 400;
      res.end('Trying send a GET request to /compress endpoint');

      return;
    };

    const download = multer().single('file');

    download(req, res, (err) => {
      if (err) {
        res.statusCode = 400;
        res.end('An unsupported compression type is provided');

        return;
      }

      if (!req.file) {
        res.statusCode = 400;
        res.end('No file is provided');

        return;
      }

      const compressionType = req.body.compressionType;
      const compress = getCompression(compressionType);
      const buffer = req.file.buffer;

      if (!compress) {
        res.statusCode = 400;
        res.end('No compression type is provided');

        return;
      }

      const fileName = `${req.file.originalname}.${compressionType}`;
      const stream = new Readable();

      stream.push(buffer);
      stream.push(null);

      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename=${fileName}`,
      });

      stream.pipe(compress).pipe(res);
    });
  });

  return server;
}

module.exports = {
  createServer,
};
