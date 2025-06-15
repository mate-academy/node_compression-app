'use strict';

const fs = require('fs');
const formidable = require('formidable');
const http = require('http');
const path = require('path');
const zlib = require('zlib');

function createServer() {
  /* Write your code here */
  // Return instance of http.Server class
  const server = new http.Server();

  server.on('request', (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      const filesPath = path.join(__dirname, 'index.html');

      fs.readFile(filesPath, (error, data) => {
        if (error) {
          res.statusCode = 500;
          res.end('Internal Server Error');

          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(data);
      });
    } else if (req.method === 'GET' && req.url === '/compress') {
      res.statusCode = 400;
      res.end('GET is not allowed method');
    } else if (req.method === 'POST' && req.url !== '/compress') {
      res.statusCode = 404;
      res.end('File Not Found');
    } else if (req.method === 'GET') {
      res.statusCode = 404;
      res.end('File Not Found');
    } else if (req.method === 'POST' && req.url === '/compress') {
      const form = new formidable.IncomingForm();

      form.parse(req, (error, fields, files) => {
        if (error) {
          res.statusCode = 400;
          res.end('Invalid request');

          return;
        }

        const file = files.file;

        const compressionType = fields.compressionType;

        if (!file || !compressionType) {
          res.statusCode = 400;
          res.end('Missing file or compression type');

          return;
        }

        const inputStream = fs.createReadStream(file[0].filepath);

        let outputStream;
        let extensionChoice = '';

        switch (compressionType[0]) {
          case 'gzip':
            outputStream = zlib.createGzip();
            extensionChoice = '.gzip';
            break;
          case 'deflate':
            outputStream = zlib.createDeflate();
            extensionChoice = '.deflate';
            break;
          case 'br':
            outputStream = zlib.createBrotliCompress();
            extensionChoice = '.br';
            break;
          default:
            res.statusCode = 400;
            res.end('Unsupported compression type');

            return;
        }

        const originalFileName = file[0].originalFilename;
        const outputFileName = originalFileName + extensionChoice;

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${outputFileName}`,
        });

        inputStream.pipe(outputStream).pipe(res);
      });
    }
  });

  return server;
}

module.exports = {
  createServer,
};
