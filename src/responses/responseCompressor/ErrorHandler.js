/* eslint-disable max-len */
'use strict';

const pretty = require('filesize');
const { errorMessage } = require('../../constants/errors');
const { compressFormats } = require('../../modules/compression/compressFormats');
const { createErrorSender } = require('../../helpers/sendError');
const { options } = require('./options');

class ErrorHandler {
  constructor(response) {
    this.sendError = createErrorSender(response);
  }

  detectTypeAndSendError(error) {
    const {
      code,
      httpCode = 500,
      message = 'Something went wrong. Server error!',
    } = error;

    if (code === 1009) {
      const maxFileSize = pretty.filesize(options.maxFileSize);

      return this.sendError(httpCode, `File is too big. Max file size is ${maxFileSize}`);
    }

    /* eslint-disable no-console */
    console.log('Undetected error: ', error);

    return this.sendError(httpCode, message);
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
