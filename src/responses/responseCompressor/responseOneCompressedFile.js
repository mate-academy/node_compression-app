'use strict';

const fs = require('fs');
const { createCompress } = require('../../modules/compression/createCompress');
const { setContentAttachment } = require('../../helpers/setContentAttachment');
const { getExt } = require('../../modules/compression/getExt');

function responseOneCompressedFile(response, files, compressFormat) {
  const file = fs.createReadStream(files[0].filepath);
  const compressedFile = createCompress(compressFormat);
  const fileName = files[0].originalFilename;

  setContentAttachment(response, `${fileName}.${getExt(compressFormat)}`);

  file.pipe(compressedFile).pipe(response);
}

module.exports = { responseOneCompressedFile };
