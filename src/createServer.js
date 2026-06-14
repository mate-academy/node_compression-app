'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const formidable = require('formidable');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      const filePath = path.join(__dirname, 'index.html');

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });

          return res.end('Error loading HTML file');
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      });

      return;
    }

    if (req.method === 'GET' && req.url === '/compress') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });

      return res.end('GET method is not allowed on this endpoint');
    }

    if (req.method === 'POST' && req.url === '/compress') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });

          return res.end('Error parsing the form');
        }

        const file = files.file;
        const compressionType = fields.compressionType;

        if (!file || !compressionType) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });

          return res.end('Invalid file or compression type');
        }

        const inputPath = file.filepath;
        const outputPath = `${inputPath}.${compressionType}`;

        let compressStream;

        switch (compressionType) {
          case 'gzip':
            compressStream = zlib.createGzip();
            break;
          case 'deflate':
            compressStream = zlib.createDeflate();
            break;
          case 'br':
            compressStream = zlib.createBrotliCompress();
            break;
          default:
            res.writeHead(400, { 'Content-Type': 'text/plain' });

            return res.end('Unsupported compression type');
        }

        const inputStream = fs.createReadStream(inputPath);
        const outputStream = fs.createWriteStream(outputPath);

        inputStream.pipe(compressStream).pipe(outputStream);

        outputStream.on('finish', () => {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${path.basename(outputPath)}"`,
          });

          res.end(
            JSON.stringify({
              originalFile: path.basename(file.originalFilename),
              compressedFile: path.basename(outputPath),
            }),
          );
        });

        outputStream.on('error', () => {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error during compression');
        });
      });

      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  return server;
}

module.exports = {
  createServer,
};
