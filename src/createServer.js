'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const formidable = require('formidable');

function createServer() {
  const server = new http.Server();

  server.on('request', async (req, res) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'POST' && pathname === '/compress') {
      const form = new formidable.IncomingForm();

      form.parse(req, (error, { compressionType }, { file }) => {
        if (error || !compressionType || !file) {
          res.statusCode = 400;
          res.end('form parsing error');

          return;
        }

        if (!['gzip', 'deflate', 'br'].includes(compressionType[0])) {
          res.statusCode = 400;
          res.end('Unknown compression type');

          return;
        }

        let compressor;

        switch (compressionType[0]) {
          case 'gzip':
            compressor = zlib.createGzip();
            break;
          case 'deflate':
            compressor = zlib.createDeflate();
            break;
          case 'br':
            compressor = zlib.createBrotliCompress();
            break;
          default:
            compressor = null;
        }

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${file[0].originalFilename}.${compressionType[0]}`,
        );

        const fileStream = fs.createReadStream(file[0].filepath);

        fileStream
          .on('error', (err) => {
            res.statusCode = 500;
            res.end(String(err));
          })
          .pipe(compressor)
          .on('error', (err) => {
            res.statusCode = 500;
            res.end(String(err));
          })
          .pipe(res)
          .on('error', (err) => {
            res.end(String(err));
          });

        res.on('close', () => fileStream.destroy());
      });
    } else if (req.method === 'GET' && pathname === '/compress') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('GET method not supported for /compress endpoint');
    } else if (req.method === 'GET' && pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('root endpoint reached');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  return server;
}

module.exports = {
  createServer,
};
