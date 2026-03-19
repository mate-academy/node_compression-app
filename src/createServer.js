'use strict';

const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const formidable = require('formidable');
const zlib = require('zlib');
const { Server } = require('node:http');

const filesRoute = {
  '/index.html': '/index.html',
  '/style.css': '/style.css',
  '/script.js': '/script.js',
};
const compressionMap = new Map([
  ['gzip', () => zlib.createGzip()],
  ['deflate', () => zlib.createDeflate()],
  ['br', () => zlib.createBrotliCompress()],
]);

const extensionMap = {
  gzip: 'gzip',
  deflate: 'deflate',
  br: 'br',
};

const handleStaticFiles = (req, res) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const requestPath =
    url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const realPath = path.join(__dirname, 'public', requestPath);

  if (fs.existsSync(realPath)) {
    const mimeType = mime.contentType(path.extname(realPath)) || 'text/plain';

    res.writeHead(200, { 'Content-Type': mimeType });

    fs.createReadStream(realPath)
      .on('error', (err) => {
        if (err) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      })
      .pipe(res);
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
};

const handleFileCompress = (req, res) => {
  const form = new formidable.IncomingForm();

  form.parse(req, (err, fields, files) => {
    if (err) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad request: Form data is invalid');

      return;
    }

    const compression = Array.isArray(fields.compressionType)
      ? fields.compressionType[0]
      : fields.compressionType;

    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file || !compression || compression === '') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad request: File or compression missing');

      return;
    }

    if (!compressionMap.has(compression)) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad request: Unsupported compression type');

      return;
    }

    const filePath = file.filepath || file.path;
    const fileName = file.originalFilename || file.name;

    const compressStream = compressionMap.get(compression)();
    const ext = extensionMap[compression];

    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename=${fileName}.${ext}`,
    });

    fs.createReadStream(filePath)
      .on('error', () => {
        if (!res.headersSent) {
          res.writeHead(500);
          res.end('Internal Server Error');
        }
      })
      .pipe(compressStream)
      .pipe(res);
  });
};

function createServer() {
  const server = new Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (filesRoute[pathname] || pathname === '/') {
      return handleStaticFiles(req, res);
    }

    if (req.method === 'POST' && pathname === '/compress') {
      return handleFileCompress(req, res);
    }

    if (req.method === 'GET' && pathname === '/compress') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('');

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
