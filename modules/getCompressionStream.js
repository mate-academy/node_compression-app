'use strict';

const zlib = require('zlib');

const getCompressionStream = (type) => {
  let stream;

  switch (type) {
    case 'brotli':
      stream = zlib.createBrotliCompress();
      break;
    case 'deflate':
      stream = zlib.createDeflate();
      break;

    default:
      stream = zlib.createGzip();
      break;
  }

  return stream;
};

module.exports = { getCompressionStream };
