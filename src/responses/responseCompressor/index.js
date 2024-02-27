/* eslint-disable max-len, object-curly-newline */
'use strict';

const formidable = require('formidable');
const { responseOneCompressedFile } = require('./responseOneCompressedFile');
const { responseCompressedFiles } = require('./responseCompressedFiles');
const { handleResponsePrediction } = require('../../modules/sizePrediction/handleResponsePrediction');
const { ErrorHandler } = require('./ErrorHandler');
const { errorMessage } = require('../../constants/errors');

async function responseCompressor(request, response) {
  const errorHandler = new ErrorHandler(response);
  const maxFileSize = 10 * 1024 ** 3;
  const form = new formidable.Formidable({
    // minFileSize: 0,
    maxFileSize,
    maxTotalFileSize: maxFileSize,
    // allowEmptyFiles: true,
  });

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
    /* eslint-disable-next-line no-console */
    console.log(error);

    return errorHandler.sendError(error.httpCode || 500, error.message);
  }
}

module.exports = { responseCompressor };
