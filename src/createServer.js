'use strict';

const http = require('http');
const zlib = require('zlib');
const { pipeline } = require('stream');
const multiparty = require('multiparty');
const fs = require('fs');
const path = require('path');

function createServer() {
  /* Write your code here */
  // Return instance of http.Server class
  const server = new http.Server();

  server.on('request', (req, res) => {
    if (req.url === '/' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');

      // Try to serve index.html if it exists, otherwise serve inline HTML
      const indexPath = path.join(__dirname, 'index.html');

      fs.access(indexPath, fs.constants.R_OK, (err) => {
        if (err) {
          // Serve inline HTML form
          res.end(`
<!DOCTYPE html>
<html>
<head><title>File Compression</title></head>
<body>
  <h1>File Compression</h1>
  <form action="/compress" method="POST" enctype="multipart/form-data">
    <input type="file" name="file" required><br><br>
    <select name="compressionType" required>
      <option value="">Select type</option>
      <option value="gzip">Gzip</option>
      <option value="deflate">Deflate</option>
      <option value="br">Brotli</option>
    </select><br><br>
    <button type="submit">Compress</button>
  </form>
</body>
</html>
          `);
        } else {
          // Serve index.html file
          const fileStream = fs.createReadStream(indexPath);

          fileStream.pipe(res);

          fileStream.on('error', () => {
            res.statusCode = 500;
            res.end('Internal Server Error');
          });
        }
      });

      return;
    }

    if (req.url !== '/compress') {
      res.statusCode = 404;
      res.end('Not Found');

      return;
    }

    if (req.method === 'GET') {
      res.statusCode = 400;
      res.end('Bad Request: GET method not allowed for /compress');

      return;
    }

    if (req.method !== 'POST') {
      // Better to check this way
      res.statusCode = 400;
      res.end('Bad Request: only POST method allowed for /compress');

      return;
    }

    const form = new multiparty.Form();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 400;
        res.end('Bad Request: error parsing form');

        return;
      }

      if (
        !files.file ||
        files.file.length === 0 ||
        !fields.compressionType ||
        fields.compressionType.length === 0
      ) {
        res.statusCode = 400;
        res.end('Bad Request: missing file or compressionType');

        return;
      }

      const compressionType = fields.compressionType[0];

      const supportedTypes = {
        gzip: zlib.createGzip,
        deflate: zlib.createDeflate,
        br: zlib.createBrotliCompress,
      };

      const extensions = {
        gzip: '.gzip',
        deflate: '.deflate',
        br: '.br',
      };

      if (!supportedTypes[compressionType]) {
        res.statusCode = 400;
        res.end('Bad Request: unsupported compression type');

        return;
      }

      const file = files.file[0];
      const originalFilename = file.originalFilename || 'file';

      res.statusCode = 200;

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${originalFilename}${extensions[compressionType]}`,
      );
      res.setHeader('Content-Type', 'application/octet-stream');

      const sourceStream = fs.createReadStream(file.path);
      const compressStream = supportedTypes[compressionType]();

      pipeline(sourceStream, compressStream, res, (e) => {
        if (e) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end('Internal Server Error');
          } else {
            res.destroy();
          }
        }
      });
    });
  });

  return server;
}

module.exports = {
  createServer,
};
