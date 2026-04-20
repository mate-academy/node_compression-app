const zlib = require('zlib');

const getCompressionOptions = (compressionType) => {
  let stream;
  let extension;

  switch (compressionType) {
    case 'gzip':
      stream = zlib.createGzip();
      extension = 'gz';
      break;
    case 'br':
      stream = zlib.createBrotliCompress();
      extension = 'br';
      break;
    case 'deflate':
      stream = zlib.createDeflate();
      extension = 'dfl';
      break;
  }

  return { stream, extension };
};

module.exports = { getCompressionOptions };
