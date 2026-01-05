/*  eslint-disable no-console */
/*  eslint-disable no-useless-return */
'use strict';

const { IncomingForm } = require('formidable');
const { Server } = require('http');
const fs = require('fs');
const zlib = require('zlib');

const ALLOWED_ENDPOINTS = {
  Compress: {
    route: '/compress',
    allowedMethods: ['POST'],
  },
  Base: {
    route: '/',
    allowedMethods: ['GET'],
  },
};

const ALLOWED_COMPRESSION_ALGS = {
  gzip: 'gzip',
  deflate: 'deflate',
  br: 'br',
};

function processResponse(options) {
  const { res, statusCode, contentType, message } = options;

  res.statusCode = statusCode;
  res.setHeader('Content-Type', contentType);
  res.end(message);

  return res;
}

function createServer() {
  const server = new Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (
      pathname === ALLOWED_ENDPOINTS.Base.route &&
      ALLOWED_ENDPOINTS.Base.allowedMethods.includes(req.method)
    ) {
      return processResponse({
        res,
        statusCode: 200,
        contentType: 'text/plain',
        message: 'Server is healthy',
      });
    }

    if (pathname !== ALLOWED_ENDPOINTS.Compress.route) {
      return processResponse({
        res,
        statusCode: 404,
        contentType: 'text/plain',
        message: 'Endpoint does not exist',
      });
    }

    if (
      pathname === ALLOWED_ENDPOINTS.Compress.route &&
      !ALLOWED_ENDPOINTS.Compress.allowedMethods.includes(req.method)
    ) {
      return processResponse({
        res,
        statusCode: 400,
        contentType: 'text/plain',
        message: `Endpoint does not support ${req.method}`,
      });
    }

    const form = new IncomingForm({});

    form.parse(req, (err, fields, files) => {
      if (err || !fields.compressionType || !files.file) {
        return processResponse({
          res,
          statusCode: 400,
          contentType: 'text/plain',
          message: 'Invalid form data',
        });
      }

      const compressionAlg = fields.compressionType?.[0];
      const file = files.file?.[0];

      const fileName = file.originalFilename;
      const filePath = file.filepath;
      const mimeType = file.mimetype;

      const fileStream = fs.createReadStream(filePath);

      let compressionStream;

      switch (compressionAlg) {
        case ALLOWED_COMPRESSION_ALGS.gzip: {
          compressionStream = zlib.createGzip();
          break;
        }

        case ALLOWED_COMPRESSION_ALGS.deflate: {
          compressionStream = zlib.createDeflate();
          break;
        }

        case ALLOWED_COMPRESSION_ALGS.br: {
          compressionStream = zlib.createBrotliCompress();
          break;
        }

        default: {
          return processResponse({
            res,
            statusCode: 400,
            contentType: 'text/plain',
            message: 'Unsupported  compression type',
          });
        }
      }

      const fileNameCompressed = `${fileName}.${extension}`;

      res.statusCode = 200;

      res.setHeader('Content-Type', mimeType);

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${fileNameCompressed}`,
      );

      fileStream
        .on('error', () => {
          console.error('Server error');
        })
        .pipe(compressionStream)
        .on('error', () => {
          console.error('Compress failed');
        })
        .pipe(res);
    });
  });

  return server;
}

module.exports = {
  createServer,
};
