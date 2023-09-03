'use strict';

/* eslint-disable no-console */
/* eslint-disable max-len */

const formidable = require('formidable');
const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const { pipeline } = require('stream');

const handleFormParse = (req, res) => {
  return new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(new Error('An error occurred while parsing the form data. Detailed info: ', err));
        res.end('Something went wrong! Try to restart this application');

        return;
      }

      const compressionType = fields.compression.toString();
      let compressionStream;
      let fullFileName;
      const file = files.file[0];
      const originalFilename = path
        .basename(file.originalFilename)
        .slice(0, file.originalFilename.indexOf('.'));

      switch (compressionType) {
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
          reject(new Error('Invalid compression type'));
          res.end('Invalid compression type');

          return;
      }

      resolve({
        file, fullFileName, compressionStream, compressionType,
      });
    });
  });
};

const handleCompressionData = async(req, res) => {
  const { file, fullFileName, compressionStream, compressionType } = await handleFormParse(req, res);
  const readStream = fs.createReadStream(file.filepath);

  res.setHeader('Content-Type', `application/${compressionType}`);
  res.setHeader('Content-Disposition', `attachment; filename=${fullFileName}`);

  pipeline(readStream, compressionStream, res, (error) => {
    if (error) {
      res.statusCode = 500;
      res.end('Something went wrong! Try to restart this application');
      throw new Error('An error occurred during receiving compressed file. Detailed info: ', error);
    } else {
      console.log('File received and compressed.');
    }
  });
};

const handleReadHtmlFile = (res) => {
  const readStream = fs.createReadStream(path.join(__dirname, 'index.html'));

  res.writeHead(200, { 'Content-Type': 'text/html' });

  pipeline(readStream, res, (err) => {
    if (err) {
      throw new Error('Something bad happened during reading html file!. Detailed info: ', err);
    }
  });
};

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    handleCompressionData(req, res);
  } else {
    handleReadHtmlFile(res);
  }
});

server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
