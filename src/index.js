'use strict';

const formidable = require('formidable');
const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const { pipeline } = require('stream');

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    const form = new formidable.IncomingForm();

    form.parse(req, async(err, fields, files) => {
      if (err) {
        console.error('An error occurred while parsing the form data. Detailed info: ', err);
        res.statusCode = 500;
        res.end('Something went wrong! Try to restart this application');

        return;
      }

      let compressionStream;
      let fullFileName;
      const file = files.file[0];
      const originalFilename = path.basename(file.originalFilename);

      switch (fields.compression.toString()) {
        case 'gzip':
          compressionStream = zlib.createGzip();
          fullFileName = originalFilename + '.gz';
          break;

        case 'brotli':
          compressionStream = zlib.createBrotliCompress();
          fullFileName = originalFilename + '.br';
          break;

        case 'deflate':
          compressionStream = zlib.createDeflate();
          fullFileName = originalFilename + '.deflate';
          break;

        default:
          res.statusCode = 400;
          res.end('Invalid compression type');

          return;
      }

      const writeStream = fs.createWriteStream(path.join(__dirname, fullFileName));
      const readStream = fs.createReadStream(file.filepath);

      pipeline(readStream, compressionStream, writeStream, (error) => {
        if (error) {
          console.error('An error occurred during receiving compressed file. Detailed info: ', err);
          res.statusCode = 500;
          res.end('Something went wrong! Try to restart this application');
        } else {
          console.log('File received and compressed.');
          res.writeHead(200, { 'Content-type': 'text/plain' });
          res.end('File received and compressed. Check your working directory to see the file');
        }
      });
    });
  } else {
    const readStream = fs.createReadStream(path.join(__dirname, 'index.html'));

    res.writeHead(200, { 'Content-Type': 'text/html' });

    pipeline(readStream, res, (err) => {
      if (err) {
        console.error('Something bad happened during reading html file!. Detailed info: ', err);
      }
    });
  }
});

server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
