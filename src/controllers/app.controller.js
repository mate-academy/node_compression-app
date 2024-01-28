'use strict';

const path = require('node:path');

const { validateCompress } = require('./app.validator');
const { compress } = require('../services/compress.service');
const { parseFormData } = require('../common/form-data.parser');
const { readFile, deleteFile } = require('../services/file-system.service');
const { PUBLIC_FOLDER } = require('../common/constants/file-system.constants');

const handleRequest = async(request, response) => {
  const url = request.url;

  if (url === '/' && request.method === 'GET') {
    try {
      const view = await readFile(path.join(PUBLIC_FOLDER, 'index.html'));

      response.statusCode = 200;
      response.end(view);
    } catch (error) {
      response.statusCode = 500;
      response.end(error);
    }
  } else if (url === '/compress') {
    const formData = await parseFormData(request);

    if (!validateCompress(request, formData)) {
      response.statusCode = 400;

      return response.end();
    }

    const originalFileBuffer = await readFile(formData.file.filepath);

    await deleteFile(formData.file.filepath);
    formData.fileBuffer = originalFileBuffer;

    const compressedFile = await compress(formData);

    response
      .setHeader(
        'Content-Disposition',
        // eslint-disable-next-line max-len
        `attachment; filename=${formData.file.originalFilename}.${compressedFile.fileExtension}`
      );
    response.statusCode = 200;
    response.end(compressedFile.fileBuffer);
  } else {
    response.statusCode = 404;

    return response.end();
  }
};

module.exports = {
  handleRequest,
};
