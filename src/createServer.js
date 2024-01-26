'use strict';

const fs = require('node:fs');
const multer = require('multer');
const path = require('node:path');
const zlib = require('node:zlib');
const express = require('express');
const { pipeline } = require('node:stream');
const bodyParser = require('body-parser');

const map = {
  gzip: zlib.createGzip(),
  deflate: zlib.createDeflate(),
  br: zlib.createBrotliCompress(),
};

const extentionMap = {
  gzip: 'gz',
  deflate: 'dfl',
  br: 'br',
};

function createServer() {
  const app = express();
  const upload = multer({ dest: '../public/' });

  app.use(bodyParser.urlencoded());

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.post('/compress', upload.single('uploaded'), (req, res) => {
    const { compressionType } = req.body;
    const { file } = req;

    if (!file || !compressionType || !map[compressionType]) {
      res.status(400);
      res.send();
    }

    const compressFunction = map[compressionType];
    const extention = extentionMap[compressionType];
    const compressedPath = `../public/${file.originalname}.${extention}`;

    const source = fs.createReadStream(file.path);
    const destination = fs.createWriteStream(compressedPath);

    pipeline(source, compressFunction, destination, (err) => {
      if (err) {
        res.status(500);
        res.send();
      }

      res.download(compressedPath);
    });
  });

  return app;
}

module.exports = {
  createServer,
};
