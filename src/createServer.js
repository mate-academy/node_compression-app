'use strict';

const fs = require('fs');
const http = require('http');
const zlib = require('zlib');
const { pipeline } = require('stream');

function createServer() {
  const server = http.createServer();

  server.on('request', (request, response) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const requestedPath = url.pathname.slice(1) || 'index.html';

    if (request.method === 'GET') {
      if (url.pathname === '/compress') {
        response.statusCode = 400;
        response.end('Bad Request');

        return;
      }

      const realPath =
        requestedPath === 'index.html'
          ? require('path').join(__dirname, 'index.html')
          : requestedPath;

      if (!fs.existsSync(realPath)) {
        response.statusCode = 404;
        response.end('Not Found');

        return;
      }

      const fileStream = fs.createReadStream(realPath);

      fileStream.pipe(response);

      return;
    }

    if (request.method === 'POST' && url.pathname === '/compress') {
      const formidable = require('formidable');
      const form = new formidable.IncomingForm();

      form.parse(request, (err, fields, files) => {
        if (err) {
          response.statusCode = 500;
          response.end('Server Error');

          return;
        }

        const file = files.file;
        const compressionType = Array.isArray(fields.compressionType)
          ? fields.compressionType[0]
          : fields.compressionType;

        if (!file) {
          response.statusCode = 400;
          response.end('Bad Request');

          return;
        }

        const fileObject = Array.isArray(file) ? file[0] : file;

        if (!compressionType) {
          response.statusCode = 400;
          response.end('Bad Request');

          return;
        }

        const supportedTypes = ['gzip', 'deflate', 'br'];

        if (!supportedTypes.includes(compressionType)) {
          response.statusCode = 400;
          response.end('Bad Request');

          return;
        }

        const originalFilename = fileObject.originalFilename || 'file';
        let extension = '';
        let compressor;

        switch (compressionType) {
          case 'gzip':
            extension = '.gz';
            compressor = zlib.createGzip();
            break;
          case 'deflate':
            extension = '.dfl';
            compressor = zlib.createDeflate();
            break;
          case 'br':
            extension = '.br';
            compressor = zlib.createBrotliCompress();
            break;
        }

        response.setHeader(
          'Content-Disposition',
          `attachment; filename=${originalFilename}${extension}`,
        );
        response.statusCode = 200;

        const fileStream = fs.createReadStream(fileObject.filepath);

        pipeline(fileStream, compressor, response, (pipelineErr) => {
          if (pipelineErr) {
            // eslint-disable-next-line no-console
            console.error('Pipeline failed.', pipelineErr);

            if (!response.headersSent) {
              response.statusCode = 500;
              response.end('Server Error');
            }
          }
        });
      });

      return;
    }

    response.statusCode = 404;
    response.end('Not Found');
  });

  server.on('error', () => {});

  return server;
}

module.exports = {
  createServer,
};
