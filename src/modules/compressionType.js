'use strict';

const zlib = require('zlib');

const getCompressionType = (compressionType) => {
  switch (compressionType) {
    case '.br':
      return zlib.createBrotliCompress;

    case '.dfl':
      return zlib.createDeflate;

    default:
      return zlib.createGzip;
  }
};

module.exports = { getCompressionType };
