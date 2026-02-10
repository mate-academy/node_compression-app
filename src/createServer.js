'use strict';

const http = require('http');
const zlib = require('zlib');
const { pipeline } = require('node:stream');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

function handleGetIndex(res) {
  const filePath = path.join(__dirname, 'index.html');

  res.writeHead(200, { 'Content-Type': 'text/html' });
  fs.createReadStream(filePath).pipe(res);
}

function handleCompress(req, res) {
  const form = new formidable.IncomingForm();

  form.parse(req, (err, fields, files) => {
    if (err) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Invalid form data');

      return;
    }

    const compressionType = Array.isArray(fields.compressionType)
      ? fields.compressionType[0]
      : fields.compressionType;

    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file || !compressionType) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing file or compression type');

      return;
    }

    const compressors = {
      gzip: { ext: '.gzip', stream: zlib.createGzip },
      deflate: { ext: '.deflate', stream: zlib.createDeflate },
      br: { ext: '.br', stream: zlib.createBrotliCompress },
    };

    const config = compressors[compressionType];

    if (!config) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Unsupported compression type');

      return;
    }

    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename=${file.originalFilename}${config.ext}`,
    });

    pipeline(
      fs.createReadStream(file.filepath),
      config.stream(),
      res,
      () => {},
    );
  });
}

function createServer() {
  return http.createServer((req, res) => {
    const { method, url } = req;

    if (method === 'GET' && (url === '/' || url === '/index.html')) {
      return handleGetIndex(res);
    }

    if (method === 'GET' && url === '/compress') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });

      return res.end('GET not allowed');
    }

    if (method === 'POST' && url === '/compress') {
      return handleCompress(req, res);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });
}

module.exports = {
  createServer,
};
