'use strict';

const { compressionRatios } = require('./compressionRatios');

function getCompressionRatios(extension) {
  return compressionRatios[extension] || 1;
}

module.exports = { getCompressionRatios };
