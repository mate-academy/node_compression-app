const zlib = require('zlib');

const getCompressedFile = (compressionType) => {
  switch (compressionType) {
    case 'gzip':
      return zlib.createGzip();
    case 'deflate':
      return zlib.createDeflate();
    case 'br':
      return zlib.createBrotliCompress();
    default:
      return null;
  }
};

module.exports = { getCompressedFile };
