'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { getArchiveStream } = require('./getArchiveStream');

const download = multer({ dest: 'download/' });
const app = express();

app.use(express.static('public'));

app.post('/download', download.single('file'), (req, res) => {
  const readStream = fs.createReadStream(req.file.path);

  const archiveType = req.body.archiveType;

  const archiveStream = getArchiveStream(archiveType);

  readStream
    .on('error', () => {
      throw new Error('Cannot read this file');
    })
    .pipe(archiveStream)
    .on('error', () => {
      throw new Error('Cannot compress this file');
    })
    .pipe(res)
    .on('error', () => {
      throw new Error('Cannot write the archive');
    });

  res.attachment(`${req.file.originalname}.${archiveType}`);

  res.on('finish', () => {
    fs.unlinkSync(path.join('./download/', req.file.filename));
  });
});

app.listen(3000);
