'use strict';

const zlib = require('zlib');

function compressFile(compressionType) {
  let extension;
  let compressedData;

  switch (compressionType) {
    case 'br':
      extension = 'br';
      compressedData = zlib.createBrotliCompress();

      break;

    case 'deflate':
      extension = 'deflate';
      compressedData = zlib.createDeflate();

      break;

    case 'gzip':
      extension = 'gzip';
      compressedData = zlib.createGzip();

      break;

    default:
      return;
  }

  return {
    compressedData, extension,
  };
}

module.exports = { compressFile };
