'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const { pipeline } = require('stream');

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    const pathFileHTML = path.join(__dirname, 'pages', 'index.html');

    const readStream = fs.createReadStream(pathFileHTML);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');

    readStream.pipe(res);

    readStream.on('error', (err) => {
      res.statusCode = 404;
      res.end('Error: ' + err);
    });

    return;
  }

  if (req.url === '/compress') {
    const multiparty = require('multiparty');

    const form = new multiparty.Form();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 404;
        res.end('Error', err);

        return;
      }

      const uploadedFile = files.file[0];
      const tempPath = uploadedFile.path;
      const newFileName = uploadedFile
        .originalFilename
        .split('.')[0]
        .replaceAll(' ', '_');
      const newFileNameWithExtension = newFileName + '.gzip';
      const targetPath = path.join(__dirname,
        'upload',
        newFileNameWithExtension
      );

      const newFile = fs.createWriteStream(targetPath);
      const file = fs.createReadStream(tempPath);
      const compression = zlib.createGzip();

      pipeline(file, compression, newFile, (error) => {
        if (error) {
          res.end(String(err));
        }
      });

      res.setHeader('Content-Type', 'application/octet-stream');

      res.setHeader('Content-Disposition',
        `attachment; filename=${newFileNameWithExtension}`);

      res.end();
    });

    return;
  }

  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(3000, () => {
  process.stdout.write('Server is running on http://localhost:3000');
});
