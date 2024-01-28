'use strict';

const fs = require('node:fs/promises');

const readFile = async(filePath) => {
  try {
    const data = await fs.readFile(filePath);

    return data;
  } catch (error) {
    throw new Error(`Error reading file: ${filePath}, error: ${error}`);
  }
};

const deleteFile = async(filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    throw new Error(`Error deleting file: ${filePath}, error: ${error}`);
  }
};

module.exports = {
  readFile,
  deleteFile,
};
