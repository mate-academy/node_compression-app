/* eslint-disable no-console */
'use strict';

const http = require('http');
const formidable = require('formidable');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const compressionTypes = ['gzip', 'deflate', 'br'];

function getCompressedFile(compressionType) {
  switch (compressionType) {
    case 'gzip':
      return zlib.createGzip();
    case 'deflate':
      return zlib.createDeflate();
    case 'br':
      return zlib.createBrotliCompress();
    default:
      return null;
  }
}

function createServer() {
  const server = new http.Server();

  server.on('request', async (req, res) => {
    const { method, url } = req;
    const urlObj = new URL(url, `http://${req.headers.host}`);
    const pathname = urlObj.pathname.slice(1) || 'index.html';
    const pathToFile = path.resolve('public', pathname);

    if (pathname === 'index.html' && method === 'GET') {
      serveStaticFile(pathToFile, res);

      return;
    }

    if (pathname !== 'compress') {
      res.setHeader('content-type', 'plain/text');
      res.statusCode = 404;
      res.end('non-existent endpoint');

      return;
    }

    if (method.toUpperCase() !== 'POST') {
      res.setHeader('content-type', 'plain/text');
      res.statusCode = 400;
      res.end('Incorrect request method');

      return;
    }

    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error(err);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(String(err));

        return;
      }

      const compressionType = fields.compressionType;

      if (!files.file) {
        console.error(err);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(String(err));

        return;
      }

      const file = files.file[0];

      if (!compressionType) {
        console.error(err);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(String(err));

        return;
      }

      if (!compressionTypes.includes(compressionType[0])) {
        console.error(err);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(String(err));

        return;
      }

      const compressed = getCompressedFile(compressionType[0]);

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=${file.originalFilename}.${compressionType[0]}`,
      });

      const fileStream = fs.createReadStream(file.filepath);

      fileStream
        .on('error', (error) => console.log(error))
        .pipe(compressed)
        .on('error', (error) => console.log(error))
        .pipe(res)
        .on('error', (error) => console.log(error));

      res.on('close', () => fileStream.destroy());
    });
  });

  return server;
}

function serveStaticFile(pathToFile, res) {
  if (!fs.existsSync(pathToFile)) {
    sendErrorResponse(res, 404, 'Not found');

    return;
  }

  const fileStream = fs.createReadStream(pathToFile);

  fileStream.on('error', () => {
    sendErrorResponse(res, 500, 'Internal Server Error');
  });

  fileStream.pipe(res);
  res.on('close', () => fileStream.destroy());
}

function sendErrorResponse(res, statusCode, message) {
  res.statusCode = statusCode;
  res.end(message);
}

module.exports = { createServer };
