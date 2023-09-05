'use strict';

const zlib = require('zlib');

const BROTLI = 'brotli';
const DEFLATE = 'deflate';
const GZIP = 'gzip';

const getCompressionType = (compressionType) => {
  switch (compressionType) {
    case BROTLI:
      return zlib.createBrotliCompress();

    case DEFLATE:
      return zlib.createDeflate();

    case GZIP:
      return zlib.createGzip();

    default:
      throw new Error('Unsupported compression type');
  }
};

module.exports = { getCompressionType };
