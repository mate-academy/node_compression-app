'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const busboy = require('busboy');

// EXTENSIONS EXPECTED BY TESTS
const EXT_MAP = {
  gzip: 'gzip',
  deflate: 'deflate',
  br: 'br',
};

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // ---------------------------------------------
    // POST /compress
    // ---------------------------------------------
    if (req.method === 'POST' && url.pathname === '/compress') {
      const bb = busboy({ headers: req.headers });

      let compressionType = null;
      let fileInfo = null;
      let invalidField = false;

      // FILE HANDLER
      bb.on('file', (fieldname, fileStream, info) => {
        // field must be named exactly "file"
        if (fieldname !== 'file') {
          invalidField = true;
          fileStream.resume();

          return;
        }

        if (fileInfo) {
          fileStream.resume();

          return;
        }

        const filename = info.filename;

        fileStream.pause();

        const processor = () => {
          if (!EXT_MAP[compressionType]) {
            res.statusCode = 400;

            return res.end('Unknown compression type');
          }

          let compressor;

          if (compressionType === 'gzip') {
            compressor = zlib.createGzip();
          } else if (compressionType === 'deflate') {
            compressor = zlib.createDeflate();
          } else if (compressionType === 'br') {
            compressor = zlib.createBrotliCompress();
          }

          const fileExt = EXT_MAP[compressionType];

          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${filename}.${fileExt}`,
          );

          fileStream.pipe(compressor).pipe(res);
        };

        fileInfo = { fileStream, filename, processor };

        if (compressionType !== null) {
          processor();
        }
      });

      // FIELDS
      bb.on('field', (name, val) => {
        if (name === 'compressionType') {
          compressionType = val;

          if (fileInfo) {
            fileInfo.processor();
          }
        }
      });

      // FINISH HANDLER
      bb.on('finish', () => {
        if (invalidField) {
          res.statusCode = 400;

          return res.end('Invalid file field name');
        }

        if (!fileInfo) {
          res.statusCode = 400;

          return res.end('No file or compressionType received');
        }

        if (!compressionType) {
          return res.writeHead(400).end();
        }

        if (!compressionType) {
          fileInfo.fileStream.resume();
          res.statusCode = 400;

          return res.end('Missing compressionType field');
        }
      });

      bb.on('error', (err) => {
        res.statusCode = 500;
        res.end(`Busboy error: ${err.message}`);
      });

      req.pipe(bb);

      return;
    }

    // ---------------------------------------------
    // GET /compress — invalid
    // ---------------------------------------------
    if (req.method === 'GET' && url.pathname === '/compress') {
      res.statusCode = 400;

      return res.end('Use POST');
    }

    // ---------------------------------------------
    // STATIC FILES
    // ---------------------------------------------
    const fileName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('public', fileName);

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;

      return res.end('file dont found');
    }

    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'text/plain');
    fs.createReadStream(filePath).pipe(res);
  });

  return server;
}

module.exports = {
  createServer,
};
