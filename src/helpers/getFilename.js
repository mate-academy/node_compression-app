function getFilename(filename, field) {
  const type = field.compressionType[0];

  switch (type) {
    case 'gzip':
      return `${filename}.gz`;
    case 'deflate':
      return `${filename}.dfl`;
    case 'br':
      return `${filename}.br`;
    default:
      return null;
  }
}

module.exports = getFilename;
