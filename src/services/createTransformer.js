'use strict';

const zlib = require('zlib');

const createTransformer = (transformer) => {
  switch (transformer) {
    case 'gzip':
      return zlib.createGzip();
    case 'br':
      return zlib.createBrotliCompress();
    case 'deflate':
      return zlib.createDeflate();
  }
};

module.exports = {
  createTransformer,
};
