'use strict';

const fs = require('fs');
const archiver = require('archiver');
const { createCompress } = require('../../modules/compression/createCompress');
const { getExt } = require('../../modules/compression/getExt');
const { setContentAttachment } = require('../../helpers/setContentAttachment');

function responseCompressedFiles(response, files, compressFormat) {
  const archive = archiver('zip');

  response.on('close', () => archive.destroy());
  setContentAttachment(response, `${files.length}-files.zip`);

  files.forEach(file => {
    const newExt = getExt(compressFormat);
    const fileStream = fs.createReadStream(file.filepath);
    const compressStream = createCompress(compressFormat);

    fileStream.pipe(compressStream);

    archive.append(compressStream, {
      name: `${file.originalFilename}.${newExt}`,
    });
  });

  archive.pipe(response);
  archive.finalize();
}

module.exports = { responseCompressedFiles };
