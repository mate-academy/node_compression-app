'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const { pipeline, Readable } = require('stream');
const multer = require('multer');

const { getCompressionStream } = require('./modules/getCompressionStream');

const PORT = process.env.PORT || 8080;

const server = new http.Server();
const upload = multer();

server.on('request', (req, res) => {
  if (req.url === '/upload' && req.method.toLowerCase() === 'post') {
    upload.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).send('File upload error');

        return;
      }

      const { buffer, originalname } = req.file;
      const { compression } = req.body;

      const fileStream = new Readable();

      fileStream.push(buffer);
      fileStream.push(null);

      const compressionStream = getCompressionStream(compression);

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${originalname}`
      );

      pipeline(fileStream, compressionStream, res, (error) => {
        if (error) {
          res.status(400).send(`Error occured: ${error}`);
        }
      });
    });

    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  const fileName = url.pathname.slice(1) || 'index.html';
  const filePath = path.resolve('public', fileName);

  if (!fs.existsSync(filePath)) {
    res.status(404).send('File does not exist');
  }

  const file = fs.createReadStream(filePath);

  file.pipe(res);

  file.on('error', () => {
    res.status(500).send('Server error');
  });

  res.on('close', () => {
    file.destroy();
  });
});

server.on('error', (err) => {
  throw new Error(err);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log('Server is on');
});
