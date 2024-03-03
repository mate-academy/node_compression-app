'use strict';

const { predictCompressedSize } = require('./predictCompressedSize');

function handleResponsePrediction(files, response) {
  const prediction = predictCompressedSize(files);

  response.setHeader('Predicted-Length', prediction);
}

module.exports = {
  handleResponsePrediction,
};
