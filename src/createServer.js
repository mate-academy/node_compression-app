'use strict';

/* eslint-disable no-console */
const { Server } = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream');
const formidable = require('formidable');

function createServer() {
  const server = new Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const fileName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('public', fileName);

    if (req.url === '/' && req.method === 'GET') {
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, 'Not Found', { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');

        return;
      }

      const fileStream = fs.createReadStream(filePath);

      res.writeHead(200, 'OK', { 'Content-Type': 'text/html' });

      fileStream
        .on('error', (error) => {
          console.log(error);
          res.statusCode = 500;
          res.end('Server Error');
        })
        .pipe(res);

      fileStream.on('close', () => fileStream.destroy());

      return;
    }

    if (req.url === '/compress' && req.method === 'POST') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, fields, files) => {
        const { compressionType } = fields;
        const { file: uploadFileName } = files;

        if (err || !compressionType || !uploadFileName) {
          console.log(err);
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Form parse error');

          return;
        }

        let compressionStream;
        let newFileName;

        switch (compressionType[0]) {
          case 'gzip':
            compressionStream = zlib.createGzip();
            newFileName = `${uploadFileName[0].originalFilename}.gzip`;
            break;
          case 'deflate':
            compressionStream = zlib.createDeflate();
            newFileName = `${uploadFileName[0].originalFilename}.deflate`;
            break;
          case 'br':
            compressionStream = zlib.createBrotliCompress();
            newFileName = `${uploadFileName[0].originalFilename}.br`;
            break;
          default:
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Unsupported compression type');

            return;
        }

        const fileStream = fs.createReadStream(uploadFileName[0].filepath);

        res.writeHead(200, {
          'Content-Disposition': `attachment; filename=${newFileName}`,
          'Content-Type': 'application/octet-stream',
        });

        pipeline(fileStream, compressionStream, res, (error) => {
          console.log(error);
          res.statusCode = 500;
          res.end('Server Error');
        });

        res.on('close', () => fileStream.destroy());
      });

      return;
    }

    if (req.url === '/compress' && req.method === 'GET') {
      res.writeHead(400, 'Not Found', { 'Content-Type': 'text/plain' });
      res.end('Trying send a GET request to "/compress" endpoint');

      return;
    }

    res.writeHead(404, 'Not Found', { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  });

  server.on('error', (error) => {
    console.log(error);
  });

  return server;
}

module.exports = {
  createServer,
};
