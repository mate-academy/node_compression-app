'use strict';

const zlib = require('zlib');

const getCorrectCompressType = (compressType) => {
  switch (compressType) {
    case 'brotli':
      return zlib.createBrotliCompress();

    case 'deflate':
      return zlib.createDeflate();

    case 'gzip':
      return zlib.createGzip();

    default:
      break;
  }
};

module.exports = { getCorrectCompressType };
