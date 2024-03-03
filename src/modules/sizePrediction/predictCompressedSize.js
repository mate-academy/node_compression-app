'use strict';

const path = require('path');
const { getCompressionRatios } = require('./getCompressionRatios');

function predictCompressedSize(files) {
  try {
    return files.reduce((sum, file) => {
      const ext = path.extname(file.originalFilename);
      const compressedRation = getCompressionRatios(ext);
      const predictedCompressedSize = file.size * compressedRation;

      return sum + predictedCompressedSize;
    }, 0);
  } catch (error) {
    throw error;
  }
}

module.exports = { predictCompressedSize };
