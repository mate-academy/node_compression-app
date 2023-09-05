'use strict';

const fs = require('fs');

function generateUniqueFileName(baseName, compressionMethod) {
  let index = 1;
  let uniqueFileName = `${baseName}.${compressionMethod}`;

  while (fs.existsSync(`${__dirname}/${uniqueFileName}`)) {
    uniqueFileName = `${baseName}-${index}.${compressionMethod}`;
    index++;
  }

  return uniqueFileName;
}

module.exports = { generateUniqueFileName };
