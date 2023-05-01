'use strict';

const zlib = require('zlib');

const compressionFile = (typeCompression) => {
  let compression = zlib.createGzip();

  if (typeCompression === 'gz') {
    compression = zlib.createGzip();
  }

  if (typeCompression === 'br') {
    compression = zlib.createBrotliCompress();
  }

  if (typeCompression === 'dfl') {
    compression = zlib.createDeflate();
  }

  return compression;
};

module.exports = { compressionFile };
