'use strict';

const zlib = require('zlib');

const getCompressionStream = (compressionType) => {
  switch (compressionType) {
    case 'brotli':
      return zlib.createBrotliCompress();

    case 'deflate':
      return zlib.createDeflate();

    default:
      return zlib.createGzip();
  }
};

module.exports = { getCompressionStream };
