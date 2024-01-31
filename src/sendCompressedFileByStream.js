'use strict';

const fs = require('node:fs');
const zlib = require('node:zlib');

const compressionTypes = Object.freeze({
  gzip: {
    compress: zlib.createGzip(),
    extension: 'gz',
  },
  deflate: {
    compress: zlib.createDeflate(),
    extension: 'dfl',
  },
  br: {
    compress: zlib.createBrotliCompress(),
    extension: 'br',
  },
});

/* eslint no-console: "warn" */
function sendCompressedFileByStream(
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

  console.info(filePath, compressionType);

  response.statusCode = 200;

  const fileStream = fs.createReadStream(filePath);
  const compressStream = compressionTypes[compressionType].compress;

  fileStream
    .on('error', (err) => {
      console.info(err);
      response.statusCode = 500;
      response.statusMessage = 'Server error in fileStream';
      response.end('Server error in fileStream');
    })
    .pipe(compressStream)
    .on('error', (err) => {
      console.info(err);
      response.statusCode = 500;
      response.statusMessage = 'Server error in compressStream';
      response.end('Server error in compressStream');
    })
    .pipe(response);

  response.on('close', () => {
    fileStream.destroy();
  });
};

module.exports = {
  sendCompressedFileByStream,
  compressionTypes,
};
