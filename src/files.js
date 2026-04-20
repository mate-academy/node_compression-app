const fs = require('node:fs');
const path = require('node:path');

const readfileStream = (res, filePath, code, message) => {
  const fileStream = fs.createReadStream(
    path.join(__dirname, `../public/${filePath}`),
  );

  res.statusMessage = message;
  res.statusCode = code;

  fileStream.pipe(res);

  fileStream.on('error', () => {
    res.statusCode = 500;
    res.end('Server Error');
  });

  fileStream.on('close', () => fileStream.destroy());
};

module.exports = { readfileStream };
