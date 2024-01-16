/* eslint-disable no-console */
'use strict';

const express = require('express');
const multer = require('multer');
const zlib = require('zlib');
const streamifier = require('streamifier');
const path = require('path');

const app = express();
const port = 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const compressionType = req.body.compressionType || 'deflate';

  const readStream = streamifier.createReadStream(req.file.buffer);

  let compressedFileStream;

  if (compressionType === 'deflate') {
    compressedFileStream = zlib.createDeflate();
  } else if (compressionType === 'gzip') {
    compressedFileStream = zlib.createGzip();
  } else {
    return res.status(400).send('Unsupported compression type.');
  }

  readStream.pipe(compressedFileStream);

  res.setHeader('Content-Disposition',
    'attachment; filename=compressed_file.txt');
  res.setHeader('Content-Type', 'application/octet-stream');

  compressedFileStream.pipe(res);
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
