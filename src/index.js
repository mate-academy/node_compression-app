'use strict';

const fs = require('fs');
const app = require('express')();
const { IncomingForm } = require('formidable');
const { pipeline } = require('stream');
const { createGzip } = require('zlib');

app.get('/', (req, res) => {
  res.end(fs.readFileSync('src/index.html'));
});

app.post('/compress', (req, res) => {
  const maxFileSize = 10 * 1024 * 1024;
  const form = new IncomingForm({
    maxFileSize,
    keepExtensions: true,
  });

  form.parse(req, (err, fields, { file }) => {
    if (err) {
      res.sendStatus(500);
    }

    const { filepath, originalFilename } = file;
    const path = `${originalFilename}.gz`;
    const stream = pipeline(
      fs.createReadStream(filepath),
      createGzip(),
      fs.createWriteStream(path),
      (error) => {
        if (error) {
          res.sendStatus(500);
        }
      },
    );

    stream.on('finish', () => res.download(path));

    res.on('close', () => {
      fs.unlinkSync(path);
      stream.destroy();
    });
  });
});

app.listen(3000);
