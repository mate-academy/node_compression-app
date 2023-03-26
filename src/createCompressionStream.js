'use strict';

const zlib = require('zlib');

const createCompressionStream = (type = '') => {
  switch (type) {
    case 'botli':
      return zlib.createBrotliCompress();

    case 'deflate':
      return zlib.createDeflate();

    default:
      return zlib.createGzip();
  }
};

module.exports = createCompressionStream;
