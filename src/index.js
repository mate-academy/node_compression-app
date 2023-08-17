/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const formidable = require('formidable');

const PORT = 4200;
const server = new http.Server();

server.on('request', (req, res) => {
  switch (req.method) {
    case 'GET':
      const filePath = path.join(__dirname, 'index.html');

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal server error');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data);
        }
      });

      break;

    case 'POST':
      const form = new formidable.IncomingForm();

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal server error');

          return;
        }

        const compressionType = fields.compressionType;
        const filePath2 = files.file.path;
        const readStream = fs.createReadStream(filePath2);
        const compressedFilePath = `${filePath2}.${compressionType}`;
        const writeStream = fs.createWriteStream(compressedFilePath);
        const compressor = compressionType === 'gzip'
          ? zlib.createGzip()
          : zlib.createDeflate();

        readStream
          .pipe(compressor)
          .pipe(writeStream);

        writeStream.on('finish', () => {
          res.writeHead(200, { 'Content-Type': 'application/octet-stream' });

          const compressedFileStream = fs.createReadStream(compressedFilePath);

          compressedFileStream.pipe(res);

          compressedFileStream.on('end', () => {
            fs.unlink(compressedFilePath, () => {});
          });
        });

        writeStream.on('error', () => {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal server error');
        });
      });

      break;

    default:
      res.writeHeader(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
  }
});

server.on('error', () => {});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
