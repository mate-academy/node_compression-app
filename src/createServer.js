'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const multiparty = require('multiparty');

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');

      res.end(`
        <form action="/compress" method="POST" enctype="multipart/form-data">
          <input id="file" name="file" type="file" required />
          <select id="compressionType" name="compressionType" required>
            <option value="">Select Compression Type</option>
            <option value="gzip">gzip</option>
            <option value="deflate">deflate</option>
            <option value="br">br</option>
          </select>
          <br><br>
          <button type="submit">Submit</button>
        </form>
      `);

      return;
    }

    if (url.pathname === '/compress' && req.method === 'GET') {
      res.statusCode = 400;
      res.end('Bad Request');

      return;
    }

    if (url.pathname === '/compress' && req.method === 'POST') {
      const form = new multiparty.Form();

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 500;
          res.end();

          return;
        }

        const compressionType = fields.compressionType
          ? fields.compressionType[0]
          : null;
        const file = files.file ? files.file[0] : null;

        if (!file || !compressionType) {
          res.statusCode = 400;
          res.end();

          return;
        }

        if (!['gzip', 'deflate', 'br'].includes(compressionType)) {
          res.statusCode = 400;
          res.end();

          return;
        }

        const readStream = fs.createReadStream(file.path);
        let compressStream;
        let endFileType;

        switch (compressionType) {
          case 'gzip':
            compressStream = zlib.createGzip();
            endFileType = 'gzip';
            break;
          case 'deflate':
            compressStream = zlib.createDeflate();
            endFileType = 'deflate';
            break;
          case 'br':
            compressStream = zlib.createBrotliCompress();
            endFileType = 'br';
            break;
        }

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${file.originalFilename}.${endFileType}`, // ///////////////////
        );
        res.setHeader('Content-Type', 'application/octet-stream');

        readStream
          .pipe(compressStream)
          .pipe(res)
          .on('error', () => {
            res.statusCode = 500;
            res.end();
          });
      });

      return;
    }

    res.statusCode = 404;
    res.end();
  });

  return server;
}

module.exports = {
  createServer,
};
