'use strict';

const fs = require('node:fs');
const zlib = require('node:zlib');

module.exports = {
  sendCompressedFile,
};

const compressionTypes = Object.freeze({
  gzip: {
    compress: zlib.gzipSync,
    extension: 'gz',
  },
  deflate: {
    compress: zlib.deflateSync,
    extension: 'dfl',
  },
  br: {
    compress: zlib.brotliCompressSync,
    extension: 'br',
  },
});

/* eslint no-console: "warn" */
function sendCompressedFile(
  response,
  filePath,
  compressionType,
) {
  if (!fs.existsSync(filePath)) {
    response.statusCode = 404;
    response.statusMessage = 'File not found';
    response.end('File not found');

    return;
  }

  if (!(compressionType in compressionTypes)) {
    response.removeHeader('Content-Disposition');
    response.removeHeader('Content-Encoding');

    response.statusCode = 400;
    response.statusMessage = 'Unsupported compression type';
    response.end('Unsupported compression type');

    return;
  }

  response.statusCode = 200;

  const dataBuffer = fs.readFileSync(filePath);
  const compressedDataBuffer
    = compressionTypes[compressionType].compress(dataBuffer);

  response.end(compressedDataBuffer);
};
