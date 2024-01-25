'use strict';

const zlib = require('zlib');

function getCompressingParams(compressionType, res) {
  let extention;
  let compressionStream;

  switch (compressionType) {
    case 'gzip':
      extention = '.gz';
      compressionStream = zlib.createGzip();
      break;

    case 'deflate':
      extention = '.dfl';
      compressionStream = zlib.createDeflate();
      break;

    case 'br':
      extention = '.br';
      compressionStream = zlib.createBrotliCompress();
      break;

    default:
      res.statusCode = 400;
      res.end('This compression type is unsupported!');
      break;
  }

  return {
    extention, compressionStream,
  };
}

module.exports = { getCompressingParams };
