const zlib = require('zlib');

function getCompressionStream(field) {
  const type = field.compressionType[0];

  switch (type) {
    case 'gzip':
      return zlib.createGzip();
    case 'br':
      return zlib.createBrotliCompress();
    case 'deflate':
      return zlib.createDeflate();
    default:
      break;
  }
}

module.exports = getCompressionStream;
