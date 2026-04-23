'use strict';

const express = require('express');
const multer = require('multer');
const zlib = require('zlib');
const fs = require('fs');
const http = require('http');

const upload = multer({ dest: 'uploads/' });

function createServer() {
  const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>My Server</title>
  </head>
  <body>
    <form action="/compress" method="post" enctype="multipart/form-data">
      <input type="file" name="file">

      <select name="compressionType">
        <option value="none">No Compression</option>
        <option value="gzip">Gzip</option>
        <option value="deflate">Deflate</option>
        <option value="br">Brotli</option>
      </select>

      <button type="submit">Submit</button>
    </form>
  </body>
</html>
`;
  const app = express();

  app.get('/', (req, res) => {
    res.send(html);
  });

  app.get('/compress', (req, res) => {
    res.status(400).send('Bad Request');
  });

  app.post('/compress', upload.single('file'), (req, res) => {
    const file = req.file;
    const compressionType = req.body.compressionType;

    if (!file) {
      return res.status(400).send('No file uploaded.');
    }

    if (!compressionType) {
      return res.status(400).send('No compression type provided.');
    }

    let transformer;
    let newFilename = file.originalname;

    switch (compressionType) {
      case 'gzip':
        transformer = zlib.createGzip();
        newFilename += '.gzip';
        break;
      case 'deflate':
        transformer = zlib.createDeflate();
        newFilename += '.deflate';
        break;
      case 'br':
        transformer = zlib.createBrotliCompress();
        newFilename += '.br';
        break;
      case 'none':
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${newFilename}`,
        );

        return fs.createReadStream(file.path).pipe(res);
      default:
        return res.status(400).send('Invalid compression type.');
    }

    res.setHeader('Content-Disposition', `attachment; filename=${newFilename}`);

    const readStream = fs.createReadStream(file.path);

    readStream.pipe(transformer).pipe(res);
  });

  app.use((req, res) => {
    res.status(404).send('404 - Сторінку не знайдено');
  });

  return http.createServer(app);
}

module.exports = {
  createServer,
};
