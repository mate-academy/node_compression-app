/* eslint-disable max-len, object-curly-newline, no-console */
'use strict';

const formidable = require('formidable');
const { responseOneCompressedFile } = require('./responseOneCompressedFile');
const { responseCompressedFiles } = require('./responseCompressedFiles');
const { handleResponsePrediction } = require('../../modules/sizePrediction/handleResponsePrediction');
const { ErrorHandler } = require('./ErrorHandler');
const { errorMessage } = require('../../constants/errors');
const { options } = require('./options');

async function responseCompressor(request, response) {
  const errorHandler = new ErrorHandler(response);
  const form = new formidable.Formidable(options);

  if (request.method.toUpperCase() !== 'POST') {
    return errorHandler.sendError(400, errorMessage.onlyPOSTSupport);
  }

  try {
    const [fields, allFiles] = await form.parse(request);
    const compressionFormat = fields['compressionType'] ? fields['compressionType'][0] : null;
    const files = allFiles['file'] || [];

    if (errorHandler.hasError(compressionFormat, files)) {
      return errorHandler.sendInvalidError(compressionFormat, files);
    }

    handleResponsePrediction(files, response);

    if (files.length > 1) {
      responseCompressedFiles(response, files, compressionFormat);
    } else {
      responseOneCompressedFile(response, files, compressionFormat);
    }
  } catch (error) {
    return errorHandler.detectTypeAndSendError(error);
  }
}

module.exports = { responseCompressor };
