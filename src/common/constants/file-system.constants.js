'use strict';

const path = require('node:path');

const config = Object.freeze({
  PUBLIC_FOLDER: path.join(process.cwd(), 'public'),
  DOWNLOAD_FOLDER: path.join(process.cwd(), 'download'),
});

module.exports = config;
