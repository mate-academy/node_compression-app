'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pipeline } = require('node:stream');
const zlib = require('node:zlib');
const { IncomingForm } = require('formidable');

const SUPPORTED_COMPRESSION_TYPES = ['gzip', 'deflate', 'br'];
const CONTENT_TYPES = {
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  plain: 'text/plain',
};

function encodeFilename(filename) {
  const cleaned = filename
    .replace(/[\r\n\t]/g, '')
    .replace(/["\\]/g, '')
    .trim();

  const hasNonASCII = [...cleaned].some((char) => char.charCodeAt(0) > 127);
  const hasSpaces = cleaned.includes(' ');

  if (hasNonASCII || hasSpaces) {
    const encoded = encodeURIComponent(cleaned);

    return `filename*=UTF-8''${encoded}`;
  }

  return `filename=${cleaned}`;
}

function createCompressionStream(type) {
  const streams = {
    gzip: () => zlib.createGzip(),
    deflate: () => zlib.createDeflate(),
    br: () => zlib.createBrotliCompress(),
  };

  return streams[type]();
}

function serveStaticFile(res, filepath, contentType) {
  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  res.end(fs.readFileSync(path.join(__dirname, filepath)));
}

function sendError(res, statusCode, message) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', CONTENT_TYPES.plain);
  res.end(message);
}

function handleCompressRequest(req, res) {
  if (req.method !== 'POST') {
    sendError(res, 400, 'Bad Request');

    return;
  }

  const form = new IncomingForm();
  let file = null;
  let compressionType = null;
  let filename = null;

  form.on('file', (name, fileData) => {
    if (name === 'file') {
      file = fileData;
      filename = fileData.originalFilename || 'file.txt';
    }
  });

  form.on('field', (name, value) => {
    if (name === 'compressionType') {
      compressionType = value;
    }
  });

  form.on('end', () => {
    if (
      !file ||
      !compressionType ||
      !SUPPORTED_COMPRESSION_TYPES.includes(compressionType)
    ) {
      sendError(res, 400, 'Bad Request');

      return;
    }

    const compressStream = createCompressionStream(compressionType);
    const encodedFilename = encodeFilename(`${filename}.${compressionType}`);
    const fileStream = fs.createReadStream(file.filepath);
    const tempFilePath = file.filepath;

    res.statusCode = 200;
    res.setHeader('Content-Disposition', `attachment; ${encodedFilename}`);

    pipeline(fileStream, compressStream, res, (err) => {
      if (err && !res.headersSent) {
        sendError(res, 500, 'Internal Server Error');
      }

      fs.unlink(tempFilePath, () => {});
    });
  });

  form.on('error', () => {
    sendError(res, 400, 'Bad Request');
  });

  form.parse(req);
}

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    if (req.url === '/') {
      serveStaticFile(res, 'index.html', CONTENT_TYPES.html);

      return;
    }

    if (req.url === '/styles.css') {
      serveStaticFile(res, 'styles.css', CONTENT_TYPES.css);

      return;
    }

    if (req.url === '/script.js') {
      serveStaticFile(res, 'script.js', CONTENT_TYPES.js);

      return;
    }

    if (req.url === '/compress') {
      handleCompressRequest(req, res);

      return;
    }

    sendError(res, 404, 'Not Found');
  });

  return server;
}

module.exports = {
  createServer,
};
