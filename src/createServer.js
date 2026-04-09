'use strict';

const formidable = require('formidable');
const http = require('http');
const zlib = require('zlib');
const fs = require('fs');

// const extensions = {
//   gzip: 'gz',
//   deflate: 'dfl',
//   br: 'br',
// };

function createServer() {
  return http.createServer((req, res) => {
    if (req.url === '/') {
      res.statusCode = 200;

      return res.end('OK');
    }

    if (req.url !== '/compress') {
      res.statusCode = 404;

      return res.end('Not found');
    }

    if (req.method === 'GET') {
      res.statusCode = 400;

      return res.end('GET not allowed');
    }

    if (req.method === 'POST') {
      const form = new formidable.IncomingForm({
        keepExtensions: true,
        multiples: false,
      });

      form.parse(req, (err, fields, files) => {
        const compressionType = Array.isArray(fields.compressionType)
          ? fields.compressionType[0]
          : fields.compressionType;

        const file = Array.isArray(files.file) ? files.file[0] : files.file;

        if (err || !compressionType || !file) {
          res.statusCode = 400;

          return res.end('Invalid form');
        }

        let compressStream;

        switch (compressionType) {
          case 'gzip':
            compressStream = zlib.createGzip();
            break;

          case 'deflate':
            compressStream = zlib.createDeflate();
            break;

          case 'br':
            compressStream = zlib.createBrotliCompress();
            break;

          default:
            res.statusCode = 400;

            return res.end('Unsupported compression type');
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/octet-stream');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${file.originalFilename}.${compressionType}`,
        );

        const read = fs.createReadStream(file.filepath);

        read.pipe(compressStream).pipe(res);

        read.on('error', () => {
          res.statusCode = 500;
          res.end('File read error');
        });

        compressStream.on('error', () => {
          res.statusCode = 500;
          res.end('Compression error');
        });

        res.on('close', () => {
          compressStream.destroy();
        });
      });
    }
  });
}

module.exports = {
  createServer,
};
