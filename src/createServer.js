'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const formidable = require('formidable');
const { pipeline } = require('stream');

function getDataFromForm(req, res) {
  const form = new formidable.IncomingForm();

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (!fields.compression || !files.file) {
        res.statusCode = 400;
        res.end('Error: You need to choose a file and a compression type');
        reject(err);
      } else {
        const compressionType = fields.compression[0];
        const file = files.file[0];

        resolve({
          compressionType, file,
        });
      }
    });
  });
}

function getParamsForCompressedFile(res, compressionType, originalFileName) {
  let extention;
  let compressionStream;

  switch (compressionType) {
    case 'gzip':
      extention = '.gz';
      compressionStream = zlib.createGzip();
      break;

    case 'deflate':
      extention = '.dfl';
      compressionStream = zlib.createDeflate();
      break;

    case 'br':
      extention = '.br';
      compressionStream = zlib.createBrotliCompress();
      break;

    default:
      res.statusCode = 400;
      res.end('This compression type is unsupported!');
      break;
  }

  const newFileName = originalFileName + extention;

  return {
    newFileName, compressionStream,
  };
}

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/') {
      const formPagePath = path.join(__dirname, 'index.html');
      const formStream = fs.createReadStream(formPagePath);

      res.writeHead(200, { 'Content-type': 'text/html' });
      formStream.pipe(res);
    } else if (url.pathname === '/compress' && req.method === 'POST') {
      getDataFromForm(req, res)
        .then(data => {
          const { compressionType, file } = data;

          const { newFileName, compressionStream } = getParamsForCompressedFile(
            res,
            compressionType,
            file.originalFilename,
          );

          // console.log(file.filepath);
          const readFileStream = fs.createReadStream(file.filepath);

          pipeline(readFileStream, compressionStream, res, (err) => {
            res.statusCode = 500;
            res.end(JSON.stringify(err));
          });

          res.statusCode = 200;

          res.setHeader(
            'content-disposition',
            `attachment; filename=${newFileName}`
          );
          res.end();

          res.on('close', () => readFileStream.destroy());
        })
        .catch(err => {
          res.statusCode = 400;
          res.end(`'Error processing the form data': ${err}`);
        });
    } else if (url.pathname === '/compress' && req.method === 'GET') {
      res.statusCode = 400;
      res.end('Can not open this page. Before go to home page');
    } else {
      res.statusCode = 404;
      res.end('The provided url is non-existent.');
    }
  });

  server.on('error', (error) => {
    /* eslint-disable-next-line */
    console.log(error);
  });

  return server;
}

module.exports = {
  createServer,
};
