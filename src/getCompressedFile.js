const zlib = require('zlib');

const COMPRESS_TYPES = {
  gzip: 'gzip',
  deflate: 'deflate',
  br: 'br',
};

const getCompressedFile = (type) => {
  switch (type) {
    case COMPRESS_TYPES.gzip:
      return zlib.createGzip();
    case COMPRESS_TYPES.br:
      return zlib.createBrotliCompress();

    default:
      return zlib.createDeflate();
  }
};

module.exports = { COMPRESS_TYPES, getCompressedFile };
