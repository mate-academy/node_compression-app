'use strict';

const http = require('http');
const zlib = require('zlib');
const { Readable } = require('stream');

function createServer() {
  return http.createServer((request, response) => {
    if (request.url === '/' && request.method === 'GET') {
      const htmlString = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Form Example</title>
        </head>
        <body>
          <form action="/compress" method="POST" enctype="multipart/form-data">
            <input type="file" name="file">
              <select name="compressionType">
                <option value="gzip">GZIP Compression</option>
                <option value="deflate">DEFLATE Compression</option>
                <option value="br">BR Compression</option>
              </select>
              <button type="submit">Submit</button>
          </form>
        </body>
        </html>
      `;

      response.setHeader('Content-Type', 'text/html');
      response.statusCode = 200;
      response.end(htmlString);
    } else if (request.url === '/compress') {
      if (request.method === 'GET') {
        response.statusCode = 400;
        response.end('Bad Request');

        return;
      }

      if (request.method === 'POST') {
        const boundary = request.headers['content-type'].split('boundary=')[1];

        const chunks = [];

        request.on('data', (chunk) => {
          chunks.push(chunk);
        });

        request.on('end', () => {
          const fullBuffer = Buffer.concat(chunks);
          const fileNameMatch = fullBuffer.toString().match(/filename="(.+?)"/);
          const compressionMatch = fullBuffer
            .toString()
            .match(/name="compressionType"\r\n\r\n(.+?)\r\n/);

          if (!fileNameMatch || !compressionMatch) {
            response.statusCode = 400;
            response.end('Bad Request');

            return;
          }

          const fileName = fileNameMatch[1];
          const compressionType = compressionMatch[1];

          if (!['gzip', 'deflate', 'br'].includes(compressionType)) {
            response.statusCode = 400;
            response.end('Invalid Compression Type');

            return;
          }

          const startFileName = fullBuffer.indexOf('filename="' + fileName);
          const fileContentStart =
            fullBuffer.indexOf('\r\n\r\n', startFileName) + 4;
          const fileContendEnd = fullBuffer.indexOf(
            '\r\n--' + boundary,
            fileContentStart,
          );
          const fileBuffer = fullBuffer.subarray(
            fileContentStart,
            fileContendEnd,
          );

          const fileStream = Readable.from(fileBuffer);

          let compressedStream;

          if (compressionType === 'gzip') {
            compressedStream = zlib.createGzip();
          }

          if (compressionType === 'deflate') {
            compressedStream = zlib.createDeflate();
          }

          if (compressionType === 'br') {
            compressedStream = zlib.createBrotliCompress();
          }

          const newFileName = `${fileName}.${compressionType}`;

          response.statusCode = 200;

          response.setHeader(
            'Content-Disposition',
            `attachment; filename=${newFileName}`,
          );

          fileStream.pipe(compressedStream).pipe(response);
        });
      }
    } else {
      response.statusCode = 404;
      response.end('Not Found');
    }
  });
}

module.exports = {
  createServer,
};
