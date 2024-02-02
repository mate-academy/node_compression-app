'use strict';

const { formidable } = require('formidable');

module.exports = {
  parseForm,
};

/* eslint no-console: "warn" */
async function parseForm(request) {
  const form = formidable({
    keepExtensions: true,
    uploadDir: './temp',
    createDirsFromUploads: true,
  });

  const [fields, files] = await form.parse(request);
  const result = {
    fileName: null,
    filePath: null,
    compressionType: null,
  };

  if ('compressionType' in fields
    && Array.isArray(fields.compressionType)) {
    result.compressionType = fields.compressionType[0];
  }

  if ('file' in files
    && Array.isArray(files.file)) {
    result.fileName = files.file[0].originalFilename || null;
    result.filePath = files.file[0].filepath || null;
  }

  console.dir(result);

  return result;
}
