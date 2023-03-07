'use strict';

const zlib = require('zlib');

const createStream = (type) => {
  switch (type) {
    case 'brotli':
      return zlib.createBrotliCompress();
    case 'deflate':
      return zlib.createDeflate();
    default:
      return zlib.createGzip();
  }
};

module.exports = { createStream };
