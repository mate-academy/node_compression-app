'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const zlib = require('zlib');

function createServer() {
  return http.createServer((req, res) => {
    switch (req.url) {
      case '/':
        handleIndexRequest(req, res);
        break;

      case '/compress':
        handleCompressRequest(req, res);
        break;

      default:
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
  });
}

function handleIndexRequest(req, res) {
  const indexPath = path.join(__dirname, 'public', 'index.html');

  fs.readFile(indexPath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');

      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
}

function handleCompressRequest(req, res) {
  if (req.method.toLowerCase() !== 'post') {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end(`The ${req.method} method is not allowed`);

    return;
  }

  const form = new formidable.IncomingForm();

  form.parse(req, (err, fields, files) => {
    if (err
      || !Object.hasOwn(fields, 'compressionType')
      || !Object.hasOwn(files, 'file')
    ) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Invalid form data');

      return;
    }

    const compressionType = fields.compressionType[0];
    const { filepath, originalFilename } = files.file[0];

    const readStream = fs.createReadStream(filepath);

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
        res.end('Invalid compression type');

        return;
    }

    readStream.pipe(compressStream);

    const fileName = `${originalFilename}.${compressionType}`;

    res.writeHead(200, {
      'Content-Disposition': `attachment; filename=${fileName}`,
    });
    compressStream.pipe(res);
  });
}

module.exports = {
  createServer,
};
