'use strict';

const { errorMessage } = require('../../constants/errors');
/* eslint-disable max-len */
const { compressFormats } = require('../../modules/compression/compressFormats');
const { createErrorSender } = require('../../helpers/sendError');

class ErrorHandler {
  constructor(response) {
    this.sendError = createErrorSender(response);
  }

  hasError(compressFormat, files) {
    return !compressFormat
      || files.length <= 0
      || !compressFormats.has(compressFormat);
  }
  sendInvalidError(compressFormat, files) {
    if (!compressFormat) {
      this.sendError(400, errorMessage.needCompressFormat);

      return;
    }

    if (files.length <= 0) {
      this.sendError(400, errorMessage.needFile);

      return;
    }

    if (!compressFormats.has(compressFormat)) {
      this.sendError(400, errorMessage.unsupportedCompressFormat);
    }
  }
}

module.exports = { ErrorHandler };
