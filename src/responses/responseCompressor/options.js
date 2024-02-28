'use strict';

const maxFileSize = 10 * 1024 ** 3;

const options = {
  maxFileSize,
  maxTotalFileSize: maxFileSize,
};

module.exports = { options };
