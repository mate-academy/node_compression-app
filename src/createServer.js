'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const { pipeline } = require('stream');
const { formidable } = require('formidable');

const compressionByType = {
  gzip: {
    createCompressor: () => zlib.createGzip(),
    extension: 'gz',
  },
  deflate: {
    createCompressor: () => zlib.createDeflate(),
    extension: 'dfl',
  },
  br: {
    createCompressor: () => zlib.createBrotliCompress(),
    extension: 'br',
  },
};

function normalizeFieldValue(value) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeFileValue(file) {
  if (Array.isArray(file)) {
    return file[0];
  }

  return file;
}

function sendStatus(res, statusCode, message = '') {
  res.statusCode = statusCode;
  res.end(message);
}

function handleCompressRequest(req, res) {
  const form = formidable({ multiples: false });

  form.parse(req, (parseError, fields, files) => {
    if (parseError) {
      sendStatus(res, 400, 'Invalid form data');

      return;
    }

    const compressionType = normalizeFieldValue(fields.compressionType);
    const uploadedFile = normalizeFileValue(files.file);

    if (!compressionType || !uploadedFile) {
      sendStatus(res, 400, 'Invalid form data');

      return;
    }

    const compressionConfig = compressionByType[compressionType];

    if (!compressionConfig) {
      sendStatus(res, 400, 'Unsupported compression type');

      return;
    }

    const originalFilename = uploadedFile.originalFilename;
    const tempFilePath = uploadedFile.filepath;

    if (!originalFilename || !tempFilePath) {
      sendStatus(res, 400, 'Invalid form data');

      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/octet-stream');

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${originalFilename}.${compressionConfig.extension}`,
    );

    pipeline(
      fs.createReadStream(tempFilePath),
      compressionConfig.createCompressor(),
      res,
      (streamError) => {
        if (streamError && !res.headersSent) {
          sendStatus(res, 500, 'Failed to compress file');
        }
      },
    );
  });
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      sendStatus(res, 200, 'Compression app server');

      return;
    }

    if (req.url === '/compress' && req.method === 'GET') {
      sendStatus(res, 400, 'Use POST method');

      return;
    }

    if (req.url === '/compress' && req.method === 'POST') {
      handleCompressRequest(req, res);

      return;
    }

    sendStatus(res, 404, 'Not found');
  });
}

module.exports = {
  createServer,
};
