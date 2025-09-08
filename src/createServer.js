/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
/* eslint-disable max-len */
const http = require('http');
const { pipeline } = require('node:stream');
const zlib = require('zlib');
const { IncomingForm } = require('formidable');
const fs = require('fs');

function createServer() {
  const server = new http.Server();

  server.on('request', (request, response) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);

    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    if (request.method === 'GET' && url.pathname === '/') {
      return prepareResponse(response, 200, 'text/plain', 'Server is running');
    }

    if (url.pathname !== '/compress') {
      return prepareResponse(
        response,
        404,
        'text/plain',
        'Use /compress endpoint',
      );
    }

    if (request.method !== 'POST') {
      return prepareResponse(response, 400, 'text/plain', 'Use POST method');
    }

    const form = new IncomingForm({ multiples: false });

    form.parse(request, (err, fields, files) => {
      if (err || !files.file || !fields.compressionType) {
        return prepareResponse(
          response,
          400,
          'text/plain',
          'Invalid form data',
        );
      }

      const compressionType = (
        Array.isArray(fields.compressionType)
          ? fields.compressionType[0]
          : fields.compressionType
      ).trim();

      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      const fileName = file.originalFilename;

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
          return prepareResponse(
            response,
            400,
            'text/plain',
            'Unsupported compression type',
          );
      }

      const fileNameCompressed = `${fileName}.${compressionType}`;

      response.statusCode = 200;

      response.setHeader(
        'Content-Disposition',
        `attachment; filename=${fileNameCompressed}`,
      );
      response.setHeader('Content-Type', 'application/octet-stream');

      pipeline(
        fs.createReadStream(file.filepath),
        compressStream,
        response,
        (error) => {
          if (error) {
            console.error('Compression error:', error);
            response.end();
          }
        },
      );
    });
  });

  return server;
}

module.exports = {
  createServer,
};

function prepareResponse(response, statusCode, contentType, endResponse) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', contentType);
  response.end(endResponse);

  return response;
}
