'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const formidable = require('formidable');

function createServer() {
  /* Write your code here */
  // Return instance of http.Server class
  const server = new http.Server();

  server.on('request', (req, res) => {
    if (req.method === 'POST' && req.url === '/compress') {
      const form = new formidable.IncomingForm({ multiples: false });

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 400;

          return res.end('Invalid form data');
        }

        const compressionType = Array.isArray(fields.compressionType)
          ? fields.compressionType[0]
          : fields.compressionType;

        const uploadedFile = Array.isArray(files.file)
          ? files.file[0]
          : files.file;

        if (!uploadedFile || !uploadedFile.filepath) {
          res.statusCode = 400;

          return res.end('File is required');
        }

        if (!compressionType) {
          res.statusCode = 400;

          return res.end('Compression type is required');
        }

        let compressor;

        switch (compressionType) {
          case 'gzip':
            compressor = zlib.createGzip();
            break;
          case 'deflate':
            compressor = zlib.createDeflate();
            break;
          case 'br':
            compressor = zlib.createBrotliCompress();
            break;
          default:
            res.statusCode = 400;

            return res.end('Unsupported compression type');
        }

        const fileStream = fs.createReadStream(uploadedFile.filepath);
        const originalFileName = path.basename(
          uploadedFile.originalFilename || 'file',
        );

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/octet-stream');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${originalFileName}.${compressionType}`,
        );

        fileStream.pipe(compressor).pipe(res);

        res.on('close', () => {
          fileStream.destroy();
          compressor.destroy();
        });
      });

      return;
    }

    if (req.method === 'GET' && req.url === '/compress') {
      res.statusCode = 400;

      return res.end('Bad Request');
    }

    if (req.method === 'GET' && req.url === '/') {
      res.statusCode = 200;
      res.setHeader('Content-type', 'text/html');

      res.end(`<form method="POST" action="/compress" enctype="multipart/form-data">
        <input name="file" type="file">
        <select name="compressionType">
          <option value="gzip">gzip</option>
          <option value="deflate">deflate</option>
          <option value="br">br</option>
        </select>
        <button type="submit">Submit</button>
      </form>`);

      return;
    }
    res.statusCode = 404;
    res.end('Not Found');
  });

  return server;
}

module.exports = {
  createServer,
};
