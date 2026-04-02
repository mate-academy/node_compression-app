'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const { IncomingForm } = require('formidable');

const SUPPORTED_TYPES = new Set(['gzip', 'deflate', 'br']);

function getFirstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function createCompressionStream(compressionType) {
  switch (compressionType) {
    case 'gzip':
      return zlib.createGzip();
    case 'deflate':
      return zlib.createDeflate();
    case 'br':
      return zlib.createBrotliCompress();
    default:
      return null;
  }
}

function handleCompressRequest(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');

    return;
  }

  const form = new IncomingForm();

  form.parse(req, (error, fields, files) => {
    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request');

      return;
    }

    const file = getFirstValue(files.file);
    const compressionType = getFirstValue(fields.compressionType);
    const filename = file?.originalFilename || file?.filename;

    if (!file || !compressionType || !filename) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request');

      return;
    }

    if (!SUPPORTED_TYPES.has(compressionType)) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request');

      return;
    }

    const compressionStream = createCompressionStream(compressionType);

    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename=${filename}.${compressionType}`,
    });

    fs.createReadStream(file.filepath)
      .on('error', () => {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      })
      .pipe(compressionStream)
      .on('error', () => {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      })
      .pipe(res);
  });
}

function createServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      const stream = fs.createReadStream('public/index.html');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      stream.pipe(res);

      stream.on('error', () => {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error reading file');
      });
    } else if (req.url === '/compress') {
      handleCompressRequest(req, res);
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
