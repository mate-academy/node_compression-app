'use strict';

const { SUPPORTED_COMPRESSION_ALGORITHMS }
  = require('../common/constants/compress.constants');

const validateCompress = (request, data) => {
  if (request.method !== 'POST') {
    return false;
  }

  if (!data.compressionType
    || !SUPPORTED_COMPRESSION_ALGORITHMS.includes(data.compressionType)) {
    return false;
  }

  if (!data.file) {
    return false;
  }

  return true;
};

module.exports = {
  validateCompress,
};
