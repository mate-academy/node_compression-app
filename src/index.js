/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const multiparty = require('multiparty');
const { getCompressionType } = require('./getCompressionType');
const { generateUniqueFileName } = require('./generateUniqueFileName');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    const form = new multiparty.Form();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 500;
        res.end('Error parsing form: ' + err.stack);

        return;
      }

      const file = files.file[0];
      const fileName = file.originalFilename;

      if (!files.file || !file) {
        res.statusCode = 400;
        res.end('You didn\'t upload a file. Try again.');

        return;
      }

      const compressionMethod = fields.compression[0];
      const compression = getCompressionType(compressionMethod);

      if (!compression) {
        res.statusCode = 400;
        res.end('Requested compression method is not supported');

        return;
      }

      const uniqueFileName
        = generateUniqueFileName(fileName, compressionMethod);
      const compressedFilePath = `${__dirname}/${uniqueFileName}`;

      const readStream = fs.createReadStream(file.path);
      const writeStream = fs.createWriteStream(compressedFilePath);

      readStream.pipe(compression).pipe(writeStream);

      readStream.on('end', () => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/octet-stream');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${fileName}.${compressionMethod}`
        );

        const compressedFile = fs.createReadStream(compressedFilePath);

        compressedFile.pipe(res);
      });
    });
  } else {
    fs.readFile('./public/index.html', 'utf8', (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.end('Server Error');

        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end(data);
    });
  }
});

server.on('error', () => {});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
