'use strict';

const zlib = require('node:zlib');
const { promisify } = require('node:util');

const { SUPPORTED_COMPRESSION_ALGORITHMS }
  = require('../common/constants/compress.constants');

const createGzip = promisify(zlib.gzip);
const createDeflate = promisify(zlib.deflate);
const createBrotliCompress = promisify(zlib.brotliCompress);

const compressionMap = {
  [SUPPORTED_COMPRESSION_ALGORITHMS[0]]: {
    extension: 'gz',
    compressor: createGzip,
  },
  [SUPPORTED_COMPRESSION_ALGORITHMS[1]]: {
    extension: 'dfl',
    compressor: createDeflate,
  },
  [SUPPORTED_COMPRESSION_ALGORITHMS[2]]: {
    extension: 'br',
    compressor: createBrotliCompress,
  },
};

const compress = async({ compressionType, fileBuffer }) => {
  const { extension, compressor } = compressionMap[compressionType];
  const compressedBuffer = await compressor(fileBuffer);

  return {
    fileExtension: extension, fileBuffer: compressedBuffer,
  };
};

module.exports = {
  compress,
};
