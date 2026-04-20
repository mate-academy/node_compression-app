/* eslint-disable no-console */
'use strict';

const http = require('http');
const zlib = require('zlib');
const { pipeline, Readable } = require('stream');

function createServer() {
  return http.createServer((req, res) => {
    const { method, url } = req;

    if (url === '/' && method === 'GET') {
      res.writeHead(200, { 'Content-type': 'text/html' });

      return res.end(`
        <form action="/compress" method="POST" enctype="multipart/form-data">
          <input type="file" name="file" required>
          <select name="compressionType">
            <option value="gzip">gzip</option>
            <option value="deflate">deflate</option>
            <option value="br">br</option>
          </select>
          <button type="submit">Compress</button>
        </form>
      `);
    }

    if (url !== '/compress') {
      res.statusCode = 404;

      return res.end('The endpoint does not exist');
    }

    if (method !== 'POST') {
      res.statusCode = 400;

      return res.end('Only POST requests are allowed');
    }

    let bodyBuffer = Buffer.alloc(0);
    let isStreamingStarted = false;

    req.on('data', (chunk) => {
      if (isStreamingStarted) {
        return;
      }

      bodyBuffer = Buffer.concat([bodyBuffer, chunk]);

      const bodyStr = bodyBuffer.toString('binary');
      const filePartHeaderMatch = bodyStr.match(
        /filename="(.+?)"\r\nContent-Type: .+?\r\n\r\n/,
      );
      const typeMatch = bodyStr.match(
        /name="compressionType"\r\n\r\n(.+?)\r\n/,
      );

      if (filePartHeaderMatch && typeMatch) {
        isStreamingStarted = true;

        const filename = filePartHeaderMatch[1];
        const compressionType = typeMatch[1].trim();

        const validTypes = {
          gzip: { create: zlib.createGzip, ext: 'gz' },
          deflate: { create: zlib.createDeflate, ext: 'dfl' },
          br: { create: zlib.createBrotliCompress, ext: 'br' },
        };

        const config = validTypes[compressionType];

        if (!config) {
          res.statusCode = 400;

          return res.end('Unsupported compression type');
        }

        // Prepare response
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${filename}.${compressionType}"`,
        });

        const headerEndIndex =
          bodyStr.indexOf(filePartHeaderMatch[0]) +
          filePartHeaderMatch[0].length;
        const initialFileData = bodyBuffer.slice(headerEndIndex);

        const boundary = bodyStr.split('\r\n')[0];
        const footerIndex = initialFileData
          .toString('binary')
          .indexOf(boundary);

        const actualFileSource = Readable.from(
          footerIndex !== -1
            ? initialFileData.slice(0, footerIndex - 2)
            : initialFileData,
        );

        pipeline(actualFileSource, config.create(), res, (err) => {
          if (err) {
            console.error(err);
          }
        });
      }
    });
  });
}

module.exports = { createServer };
