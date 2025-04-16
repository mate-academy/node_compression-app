'use strict';

const http = require('http');
const { IncomingForm } = require('formidable');
const zlib = require('zlib');
const fs = require('fs');

function createServer() {
  /* Write your code here */
  // Return instance of http.Server class
  return http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/compress') {
      const form = new IncomingForm({ multiples: false });

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 500;

          return res.end('Error parsing form');
        }

        const compressionType = Array.isArray(fields.compressionType)
          ? fields.compressionType[0]
          : fields.compressionType;
        const file = files.file;

        if (!file) {
          res.statusCode = 400;

          return res.end();
        }

        if (!compressionType) {
          res.statusCode = 400;

          return res.end();
        }

        const originalFileName = file[0].originalFilename;
        const filePath = file[0].filepath.replace(/\\/g, '/');

        let compressor;
        let ext;

        switch (compressionType) {
          case 'gzip':
            compressor = zlib.createGzip();
            ext = '.gzip';
            break;

          case 'deflate':
            compressor = zlib.createDeflate();
            ext = '.deflate';
            break;

          case 'br':
            compressor = zlib.createBrotliCompress();
            ext = '.br';
            break;

          default:
            res.statusCode = 400;
            res.end();

            return;
        }

        const compressedFileName = originalFileName + ext;

        if (file && compressor) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/octet-stream');

          res.setHeader(
            'Content-Disposition',
            `attachment; filename=${compressedFileName}`,
          );

          const readStream = fs.createReadStream(filePath);

          readStream.pipe(compressor).pipe(res);
        } else {
          res.statusCode = 500;
          res.end('Error processing file or compressor');
        }
      });
    } else if (req.method === 'GET' && req.url === '/') {
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
    } else if (req.method === 'GET' && req.url === '/compress') {
      res.statusCode = 400;
      res.end();
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });
}

module.exports = {
  createServer,
};
