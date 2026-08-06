/* eslint-disable no-console */
const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const formidable = require('formidable');
const path = require('path');

const getCompressionFile = (type) => {
  switch (type) {
    case 'gzip':
      return zlib.createGzip();

    case 'deflate':
      return zlib.createDeflate();

    case 'br':
      return zlib.createBrotliCompress();

    default:
      return null;
  }
};

function createServer() {
  const server = http.createServer();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (req.method === 'GET' && pathname === '/') {
      const indexPath = path.resolve('public', 'index.html');

      res.writeHead(200, { 'Content-Type': 'text/html' });

      return fs.createReadStream(indexPath).pipe(res);
    }

    if (pathname !== '/compress') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });

      return res.end('Not found');
    }

    if (req.method !== 'POST') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });

      return res.end('GET request not allowed on this endpoint');
    }

    if (req.method === 'POST' && pathname === '/compress') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });

          return res.end('Error parsing form data');
        }

        let compressionType = fields.compressionType;

        if (Array.isArray(compressionType)) {
          compressionType = compressionType[0];
        }

        if (!files.file) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });

          return res.end('No file uploaded');
        }

        const file = files.file[0];
        const compressStream = getCompressionFile(compressionType);

        if (!compressStream) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });

          return res.end('Unsupported compression type');
        }

        const fileStream = fs.createReadStream(file.filepath);
        const compressedFileName = `${file.originalFilename}.${compressionType}`;

        res.writeHead(200, {
          'Content-Disposition': `attachment; filename=${compressedFileName}`,
        });

        fileStream.pipe(compressStream).pipe(res);
      });
    }
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });

  return server;
}

module.exports = {
  createServer,
};
