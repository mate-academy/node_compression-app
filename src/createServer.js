'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const zlib = require('zlib');
const formidable = require('formidable');

function createServer() {
  return http.createServer((req, res) => {
    const normalizedUrl = new URL(req.url || '', `http://${req.headers.host}`);

    const requestedPath = normalizedUrl.pathname.slice(1) || 'index.html';

    const realPath = path.join('public', requestedPath);

    // -------------------------
    // /compress endpoint
    // -------------------------
    if (requestedPath === 'compress') {
      if (req.method !== 'POST') {
        res.statusCode = 400;
        res.end('Bad Request');

        return;
      }

      const form = new formidable.IncomingForm({
        multiples: false,
        keepExtensions: true,
      });

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 400;
          res.end('Bad Request');

          return;
        }

        const compressionType = Array.isArray(fields.compressionType)
          ? fields.compressionType[0]
          : fields.compressionType;

        const uploadedFile = Array.isArray(files.file)
          ? files.file[0]
          : files.file;

        if (!uploadedFile) {
          res.statusCode = 400;
          res.end('File is required');

          return;
        }

        if (compressionType === undefined) {
          res.statusCode = 400;
          res.end('Compression type is required');

          return;
        }

        const fileName = uploadedFile.originalFilename;

        if (!fileName) {
          res.statusCode = 400;
          res.end('Filename is required');

          return;
        }

        let compressStream;
        let ext;

        if (compressionType === 'gzip') {
          compressStream = zlib.createGzip();
          ext = '.gz';
        } else if (compressionType === 'deflate') {
          compressStream = zlib.createDeflate();
          ext = '.dfl';
        } else if (compressionType === 'br') {
          compressStream = zlib.createBrotliCompress();
          ext = '.br';
        } else {
          res.statusCode = 400;
          res.end('Unsupported compression type');

          return;
        }

        const finalName = fileName + ext;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/octet-stream');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${finalName}`,
        );

        const fileStream = fs.createReadStream(uploadedFile.filepath);

        fileStream
          .on('error', () => {
            if (!res.headersSent) {
              res.statusCode = 500;
              res.end('Internal Server Error');
            }
          })
          .pipe(compressStream)
          .on('error', () => {
            if (!res.headersSent) {
              res.statusCode = 500;
              res.end('Internal Server Error');
            }
          })
          .pipe(res);

        res.on('finish', () => {
          fileStream.destroy();
          fs.unlink(uploadedFile.filepath, () => {});
        });
      });

      return;
    }

    // -------------------------
    // Static files
    // -------------------------
    if (!fs.existsSync(realPath)) {
      res.statusCode = 404;
      res.end('Not Found');

      return;
    }

    const mimeType = mime.contentType(path.extname(realPath)) || 'text/plain';

    res.statusCode = 200;
    res.setHeader('Content-Type', mimeType);

    const staticFileStream = fs.createReadStream(realPath);

    staticFileStream
      .on('error', () => {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      })
      .pipe(res);

    res.on('close', () => {
      staticFileStream.destroy();
    });
  });
}

module.exports = {
  createServer,
};
