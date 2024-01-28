'use strict';

const { formidable } = require('formidable');

const { DOWNLOAD_FOLDER }
  = require('../common/constants/file-system.constants');

const parseFormData = async(request) => {
  const form = formidable({
    keepExtensions: true,
    uploadDir: DOWNLOAD_FOLDER,
    createDirsFromUploads: true,
  });
  const [fields, files] = await form.parse(request);

  return Object.entries({
    ...fields, ...files,
  }).reduce((acc, curr) => {
    acc[curr[0]] = curr[1][0];

    return acc;
  }, {});
};

module.exports = {
  parseFormData,
};
