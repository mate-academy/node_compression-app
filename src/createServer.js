'use strict';

const zlib = require('zlib');
const http = require('http');
const { Readable } = require('node:stream');

function createServer() {
  const server = http.createServer();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const reqPath = url.pathname;

    if (reqPath === '/' && req.method === 'GET') {
      res.statusCode = 200;

      return res.end();
    }

    if (reqPath !== '/compress') {
      res.statusCode = 404;

      return res.end('Not Found');
    }

    if (req.method === 'GET' || req.method !== 'POST') {
      res.statusCode = 400;

      return res.end('Bad Request');
    }

    const chunks = [];

    req.on('data', (chunk) => chunks.push(chunk));

    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const bufferString = buffer.toString('utf8');

      const compressionMatch = bufferString.match(
        /name="compressionType"\r\n\r\n(gzip|deflate|br)/,
      );

      if (!compressionMatch) {
        res.statusCode = 400;

        return res.end('Bad Request: Invalid or unsupported compression type');
      }

      const compressionType = compressionMatch[1];

      const filenameMatch = bufferString.match(/filename="([^"]+)"/);

      if (!filenameMatch) {
        res.statusCode = 400;

        return res.end('Bad Request: No file found in form');
      }

      const originalFilename = filenameMatch[1];

      const filenameIndex = buffer.indexOf('filename="');
      const headerEndIndex = buffer.indexOf('\r\n\r\n', filenameIndex);

      if (filenameIndex === -1 || headerEndIndex === -1) {
        res.statusCode = 400;

        return res.end('Bad Request: Invalid form data');
      }

      const startIndex = headerEndIndex + 4;
      const endIndex = buffer.indexOf('\r\n------', startIndex);

      if (endIndex === -1) {
        res.statusCode = 400;

        return res.end('Bad Request: Malformed form data boundaries');
      }

      const fileBuffer = buffer.subarray(startIndex, endIndex);
      const fileStream = Readable.from(fileBuffer);

      let resFile = null;

      switch (compressionType) {
        case 'gzip':
          resFile = zlib.createGzip();
          break;
        case 'deflate':
          resFile = zlib.createDeflate();
          break;
        case 'br':
          resFile = zlib.createBrotliCompress();
          break;
      }

      res.statusCode = 200;

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${originalFilename}.${compressionType}`,
      );

      fileStream.on('error', () => {
        if (!res.headersSent) {
          res.statusCode = 500;
        }
        res.end('Server Error during read');
      });

      resFile.on('error', () => {
        if (!res.headersSent) {
          res.statusCode = 500;
        }
        res.end('Server Error during compression');
      });

      fileStream.pipe(resFile).pipe(res);
    });
  });

  return server;
}

module.exports = {
  createServer,
};
