'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const stream = require('node:stream');

function createServer() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const method = request.method;

    if (url.pathname === '/') {
      response.statusCode = 200;
      response.setHeader('content-type', 'text/html');

      fs.createReadStream(path.join(__dirname, 'public/index.html')).pipe(
        response,
      );

      return;
    }

    if (url.pathname === '/compress') {
      if (method === 'GET') {
        response.statusCode = 400;
        response.end();

        return;
      }

      const buffer = [];

      for await (const chunk of request) {
        buffer.push(chunk);
      }

      const body = Buffer.concat(buffer);

      try {
        const contentType = request.headers['content-type'];
        const boundary = contentType.slice(
          contentType.indexOf('boundary=') + 'boundary='.length,
        );

        const firstBoundaryIndex = body.indexOf('--' + boundary);

        const fileStartIndex = body.indexOf('\r\n\r\n', firstBoundaryIndex) + 4;
        const fileEndIndex = body.indexOf('\r\n--' + boundary, fileStartIndex);

        const fileContent = body.subarray(fileStartIndex, fileEndIndex);

        const fileName = body
          .subarray(firstBoundaryIndex, fileStartIndex)
          .toString('utf-8')
          .split('filename="')[1]
          .split('"')[0];

        const compressionType = body
          .subarray(fileEndIndex)
          .toString('utf-8')
          .split('name="compressionType"\r\n\r\n')[1]
          .split('\r\n')[0];

        if (!['gzip', 'deflate', 'br'].includes(compressionType)) {
          response.statusCode = 400;
          response.end();

          return;
        }

        response.statusCode = 200;

        if (compressionType === 'gzip') {
          response.setHeader(
            'Content-Disposition',
            `attachment; filename=${fileName}.gz`,
          );

          stream.pipeline(
            stream.Readable.from(fileContent),
            zlib.createGzip(),
            response,
            () => {},
          );

          return;
        }

        if (compressionType === 'deflate') {
          response.setHeader(
            'Content-Disposition',
            `attachment; filename=${fileName}.dfl`,
          );

          stream.pipeline(
            stream.Readable.from(fileContent),
            zlib.createDeflate(),
            response,
            () => {},
          );

          return;
        }

        if (compressionType === 'br') {
          response.setHeader(
            'Content-Disposition',
            `attachment; filename=${fileName}.br`,
          );

          stream.pipeline(
            stream.Readable.from(fileContent),
            zlib.createBrotliCompress(),
            response,
            () => {},
          );

          return;
        }
      } catch {
        response.statusCode = 400;
        response.end();

        return;
      }
    }

    response.statusCode = 404;
    response.end();
  });
}

module.exports = {
  createServer,
};
