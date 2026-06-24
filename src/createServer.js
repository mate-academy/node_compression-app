'use strict';

const http = require('http');
const path = require('path');
const zlib = require('zlib');
const fs = require('fs');
const { IncomingForm } = require('formidable');
const { pipeline } = require('stream');

const compressionTypes = {
  gzip: {
    createStream: zlib.createGzip,
    extension: '.gz',
  },
  deflate: {
    createStream: zlib.createDeflate,
    extension: '.dfl',
  },
  br: {
    createStream: zlib.createBrotliCompress,
    extension: '.br',
  },
};

function sendHtml(response) {
  const filePath = path.join(__dirname, 'index.html');

  const stream = fs.createReadStream(filePath);

  stream.pipe(response);
}

function sendCss(response) {
  const filePath = path.join(__dirname, 'styles', 'style.css');

  response.setHeader('Content-Type', 'text/css');

  fs.createReadStream(filePath).pipe(response);
}

function createServer() {
  return http.createServer((request, response) => {
    const { method, url } = request;

    if (method === 'GET' && url === '/') {
      sendHtml(response);

      return;
    }

    if (method === 'GET' && url === '/styles/style.css') {
      sendCss(response);

      return;
    }

    if (method === 'GET' && url === '/compress') {
      response.writeHead(400, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      response.end('Bad request');

      return;
    }

    if (method === 'POST' && url === '/compress') {
      const form = new IncomingForm({
        multiples: false,
        keepExtensions: true,
      });

      form.parse(request, (error, fields, files) => {
        if (error) {
          response.writeHead(400, {
            'Content-Type': 'text/plain; charset=utf-8',
          });
          response.end('Bad request');

          return;
        }

        const compressionType = Array.isArray(fields.compressionType)
          ? fields.compressionType[0]
          : fields.compressionType;

        if (!Object.hasOwn(compressionTypes, compressionType)) {
          response.writeHead(400, {
            'Content-Type': 'text/plain; charset=utf-8',
          });
          response.end('Compression type is unsupported');

          return;
        }

        const uploaded = files.file;

        if (!uploaded) {
          response.writeHead(400, {
            'Content-Type': 'text/plain; charset=utf-8',
          });
          response.end('Request has not file');

          return;
        }

        const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;

        const tempPath = file.filepath;

        const originalName = file.originalFilename || 'file';
        const safeName =
          path.basename(originalName) +
          compressionTypes[compressionType].extension;

        const encodedName = encodeURIComponent(safeName);

        response.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${encodedName}`,
        });

        pipeline(
          fs.createReadStream(tempPath),
          compressionTypes[compressionType].createStream(),
          response,
          (err) => {
            fs.unlink(tempPath, () => {});

            if (err) {
            }
          },
        );
      });

      return;
    }

    response.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8',
    });

    response.end('Non found');
  });
}

module.exports = {
  createServer,
};
