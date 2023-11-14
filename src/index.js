'use strict'

const path = require('path');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const express = require('express');
const zlib = require('zlib');
const app = express();

app.use('/', async(req, res, next) => {
  const filePath = path.resolve('public', 'index.html');

  res.sendFile(filePath);
});

// app.use(express.urlencoded({ extended: true }));

app.post('/uploads', upload.single('file'), (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const params = url.searchParams;
  const compressionType = params.get('compression');
  let gzip;

  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${req.file.filename}`,
  );

  if (compressionType === 'gzip') {
    gzip = zlib.createGzip();
  } else {
    gzip = zlib.createBrotliCompress();
  }

  req.file.pipe(gzip).pipe(res);
  // res.json({ message: 'File uploaded successfully!' });
});

app.listen(3005, () => {
  // eslint-disable-next-line
  console.log('Server is running');
});

module.exports = {
  app,
};
