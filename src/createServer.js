'use strict';

const http = require('http');
const { IncomingForm } = require('formidable');
const zlib = require('zlib');
const fs = require('fs');

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/compress') {
      const form = new IncomingForm({ multiples: false });

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 400;

          return res.end('Parsing form error');
        }

        const compressionType = Array.isArray(fields.compressionType)
          ? fields.compressionType[0]
          : fields.compressionType;
        const file = files.file;

        if (!file) {
          res.statusCode = 400;

          return res.end('Missing file');
        }

        if (!compressionType) {
          res.statusCode = 400;

          return res.end('Missing compression type');
        }

        const originalFileName = file[0].originalFilename;
        const filePath = file[0].filepath.replace(/\\/g, '/');

        let compressor;
        let ext;

        switch (compressionType) {
          case 'gz':
            compressor = zlib.createGzip();
            ext = '.gz';
            break;

          case 'dfl':
            compressor = zlib.createDeflate();
            ext = '.dfl';
            break;

          case 'br':
            compressor = zlib.createBrotliCompress();
            ext = '.br';
            break;

          default:
            res.statusCode = 400;
            res.end('Unsupported compression type');

            return;
        }

        const compressedFileName = originalFileName + ext;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/octet-stream');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${compressedFileName}`,
        );

        const readStream = fs.createReadStream(filePath);

        readStream.pipe(compressor).pipe(res);
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
      res.end('GET not allowed');
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
}

module.exports = {
  createServer,
};
