'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const zlib = require('zlib');

function createServer() {
  return http.createServer((req, res) => {
    const { method, url } = req;

    if (method === 'GET' && url === '/') {
      serveHomePage(res);

      return;
    }

    if (method === 'POST' && url === '/compress') {
      handleFileCompression(req, res);

      return;
    }

    if (method === 'GET' && url === '/compress') {
      sendErrorResponse(res, 400, 'GET not allowed on /compress');

      return;
    }

    sendErrorResponse(res, 404, 'Not Found');
  });
}

function serveHomePage(res) {
  const filePath = path.join(__dirname, 'public/index.html');

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendErrorResponse(res, 500, 'Server error');

      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
}

function handleFileCompression(req, res) {
  const form = new formidable.IncomingForm();

  form.parse(req, (err, fields, files) => {
    if (err) {
      sendErrorResponse(res, 400, 'Invalid form');

      return;
    }

    const compressionType = fields.compressionType;
    const file = files.file;

    if (!file || !compressionType) {
      sendErrorResponse(res, 400, 'Missing file or compression type');

      return;
    }

    compressAndSendFile(file[0], compressionType[0], res);
  });
}

function compressAndSendFile(file, compressionType, res) {
  const inputStream = fs.createReadStream(file.filepath);
  const compressOptions = getCompressionOptions(compressionType);

  if (!compressOptions) {
    sendErrorResponse(res, 400, 'Unsupported compression type');

    return;
  }

  const { compressStream, extension } = compressOptions;
  const originalName = file.originalFilename;
  const outputName = originalName + extension;

  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename=${outputName}`,
  });

  inputStream.pipe(compressStream).pipe(res);
}

function getCompressionOptions(compressionType) {
  switch (compressionType) {
    case 'gzip':
      return {
        compressStream: zlib.createGzip(),
        extension: '.gzip',
      };

    case 'deflate':
      return {
        compressStream: zlib.createDeflate(),
        extension: '.deflate',
      };

    case 'br':
      return {
        compressStream: zlib.createBrotliCompress(),
        extension: '.br',
      };

    default:
      return null;
  }
}

function sendErrorResponse(res, statusCode, message) {
  res.writeHead(statusCode);
  res.end(message);
}

module.exports = {
  createServer,
};
