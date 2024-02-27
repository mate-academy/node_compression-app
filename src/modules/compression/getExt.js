'use strict';

function getExt(format) {
  switch (format) {
    case 'gzip':
      return 'gz';
    case 'deflate':
      return 'deflate';
    case 'brotli':
      return 'br';
    default:
      return '';
  }
};

module.exports = { getExt };
