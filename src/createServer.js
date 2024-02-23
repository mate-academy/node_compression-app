'use strict';

const http = require('http');
const fs = require('fs');
const formidable = require('formidable');
const zlip = require('zlib');

function createServer() {
  const server = http.createServer();

  server.on('request', (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      const file = fs.createReadStream('public/index.html');

      res.setHeader('Content-type', 'text/html');
      file.pipe(res);
    } else if (req.method === 'POST' && req.url === '/compress') {
      const form = new formidable.IncomingForm({
        // uploadDir: `${__dirname}/../uploads`,
        // keepExtensions: true,
      });

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Server error');

          return;
        }

        const compressionType = fields.compressionType[0];
        const file = files.file[0];
        const filePath = file.filepath;
        const fileName = file.originalFilename;

        console.log(compressionType);

        if (!files.hasOwnProperty('file')
          || !fields.hasOwnProperty('compressionType')) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid from data');

          return;
        }

        const input = fs.createReadStream(filePath);

        let compressStream;


        switch (compressionType) {
          case 'gzip':
            compressStream = zlip.createGzip();
            break;
          case 'deflate':
            compressStream = zlip.createDeflate();
            break;
          case 'br':
            compressStream = zlip.createBrotliCompress();
            break;
          default:
            res.writeHead(400, { 'Content-type': 'text/plain' });
            res.end('Unsupported compression type');

            return;
        }

        res.writeHead(200, { 'Content-Disposition':
          `attachment; filename=${fileName}.${compressionType}` }
        );

        input.pipe(compressStream).pipe(res);
      });
    } else if (req.method === 'GET' && req.url === '/compress') {
      res.writeHead(400, { 'Content-type': 'text/plain' });
      res.end('Wrong method');
    } else {
      res.writeHead(404, { 'Content-type': 'text/plain' });
      res.end('Not found');
    }
  });

  return server;
}

module.exports = {
  createServer,
};
