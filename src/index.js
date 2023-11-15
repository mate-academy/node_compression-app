'use strict';

const path = require('path');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const express = require('express');
const zlib = require('zlib');
const { Readable } = require('stream');
const app = express();

app.get('/', async(req, res) => {
  const filePath = path.resolve('public', 'index.html');

  res.sendFile(filePath);
});

app.post('/', upload.single('file'), (req, res) => {
  const { compression } = req.body;
  const { originalname, buffer } = req.file;
  const compressionStreamType = (compressionType) => {
    switch (compressionType) {
      case 'brotli':
        return zlib.createBrotliCompress();

      default:
        return zlib.createGzip();
    }
  };

  res.writeHead(200,
    {
      'Content-Disposition':
        `attachment; filename=${originalname}.${compression}`
    },
  );

  const fileStream = Readable.from(buffer);

  fileStream.pipe(compressionStreamType(compression).pipe(res));
});

app.listen(3005, () => {
  // eslint-disable-next-line
  console.log('Server is running');
});

module.exports = {
  app,
};
