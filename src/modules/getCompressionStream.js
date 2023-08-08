'use strict';

const zlib = require('zlib');

const getCompressionStream = (compressionType) => {
  let compressionStream;

  switch (compressionType) {
    case 'brotli':
      compressionStream = zlib.createBrotliCompress();
      break;

    case 'deflate':
      compressionStream = zlib.createDeflate();
      break;

    default:
      compressionStream = zlib.createGzip();
      break;
  }

  return compressionStream;
};

module.exports = { getCompressionStream };
