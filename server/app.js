'use strict';

const http = require('http');
const fs = require('fs');
const { pipeline } = require('stream');
const zlib = require('zlib');
const { StringDecoder } = require('node:string_decoder');
const { multiparty } = require('multiparty');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // res.setHeader('Access-Control-Allow-Credentials', 'true');
  // res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');

  res.setHeader('Access-Control-Allow-Headers',
    'Access-Control-Allow-Headers, Origin, Accept, X-Requested-With,'
      + 'Content-Type, Access-Control-Request-Method,'
      + 'Access-Control-Request-Headers');
  res.setHeader('Content-Disposition', 'attachment');

  console.log('Request received');
  // console.log(req.file.originalname);
  // console.log(req);
  // console.log(req.read());

  // let body = '';

  // const gzip = zlib.createGzip();

  let body = '';
  let fileData = null;
  let filePath = '';
  let compressionType = '';

  req.on('data', (chunk) => {
    body += chunk;

    if (body.includes('\r\n--')) {
      const parts = body.split('\r\n--');

      for (const part of parts) {
        const [header, data] = part.split('\r\n\r\n');

        if (header.includes('filename=')) {
          const [, name] = header.split('filename=');

          filePath = name.replace(/"/g, '');

          fileData = data.substring(0, data.lastIndexOf('\r\n'));
        } else if (header.includes('name="data"')) {
          const index = part.indexOf('name="data"') + 11;

          compressionType = JSON.parse(part.slice(index)).type;
        }
      }
    }
  });

  req.on('end', () => {
    const lastIndex = filePath.lastIndexOf('Content-Type');

    const fileName = './public/' + filePath.slice(0, lastIndex - 2);

    fs.writeFile(fileName, fileData, (err) => {
      if (err) {
        res.statusCode = 500;
        res.end('Server Error');
      } else {
        let zip = zlib.createGzip();

        switch (compressionType) {
          case 'gzip':
            zip = zlib.createGzip();
            break;
          case 'gunzip':
            zip = zlib.createGunzip();
            break;
          case 'inflate':
            zip = zlib.createInflate();
            break;
        };

        const fileStream = fs.createReadStream(fileName);
        const writeStream = fs.createWriteStream(fileName + '.gz');

        fileStream.pipe(zip).pipe(writeStream);

        writeStream.on('finish', () => {
          res.setHeader('Content-Type', 'application/octet-stream');

          res.setHeader('Content-Disposition', 'attachment; filename='
            + fileName + '.gz');
          fs.createReadStream(fileName + '.gz').pipe(res);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
        });
      }
    });
  });
});

server.on('error', () => {});

server.listen(5001, () => {
  // eslint-disable-next-line no-console
  console.log('Server started! 🚀');
});
