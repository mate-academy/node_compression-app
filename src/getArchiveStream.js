'use strict';

const zlib = require('zlib');

const getArchiveStream = (extension) => {
  switch (extension) {
    case 'br':
      return zlib.createBrotliCompress();

    case 'gz':
      return zlib.createGzip();

    default:
      return zlib.createGzip();
  }
};

module.exports = {
  getArchiveStream,
};
