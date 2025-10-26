'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { formidable } = require('formidable');
const { pipeline } = require('stream');
const mime = require('mime-types');

function createServer() {
  const server = http.createServer();
  const PUBLIC_PATH = path.join(__dirname, '..', 'public');

  server.on('request', (req, res) => {
    // index.html and style.css responses
    if (req.url === '/') {
      res.setHeader('Content-type', 'text/html');

      const INDEX_PATH = path.resolve(PUBLIC_PATH, 'index.html');

      if (!fs.existsSync(INDEX_PATH)) {
        res.statusCode = 404;
        res.end('Not Found Page');

        return;
      }

      const file = fs.createReadStream(INDEX_PATH);

      file.pipe(res);

      res.on('close', () => {
        file.destroy();
      });

      return;
    }

    if (req.url === '/favicon.ico') {
      const favicon = fs.createReadStream(path.resolve('public/favicon.ico'));

      res.statusCode = 200;
      favicon.pipe(res);

      return;
    }

    if (req.url === '/style.css') {
      res.setHeader('Content-type', 'text/css');

      const STYLES_PATH = path.resolve(PUBLIC_PATH, 'style.css');

      if (!fs.existsSync(STYLES_PATH)) {
        res.end('');

        return;
      }

      const cssFile = fs.createReadStream(STYLES_PATH);

      cssFile.pipe(res);

      res.on('close', () => {
        cssFile.destroy();
      });

      return;
    }

    // Compression Logic
    if (req.url === '/compress') {
      // check, if method === POST, otherwise 400
      if (req.method !== 'POST') {
        res.statusCode = 400;
        res.end('Wrong request method!');

        return;
      }

      // let's create a Form object from Formidable lib,
      // which will help us to deal with Form data

      const form = formidable({
        multiples: false,
        uploadDir: path.resolve('public/uploads'),
      });

      // use mime-types from NPM to detect content-type of archive
      let mimeType = '';

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 400;
          res.end(err);

          return;
        }
        // let's fetch compressionType & file obiviosly

        const compressionType = fields.compressionType[0];

        const uploadedFile = files.filePicker[0];

        // double sanity for non-valid input
        if (!compressionType || !uploadedFile) {
          res.statusCode = 400;
          res.end('Invalid input!');

          return;
        }

        // let's rename uploaded file to it's original filename

        const correctUploadedFilePath = path.resolve(
          'public/uploads',
          uploadedFile.originalFilename,
        );

        fs.rename(uploadedFile.filepath, correctUploadedFilePath, (_err) => {
          if (_err) {
            res.statusCode = 500;
            res.end('Error while renaming uploaded file!');

            return;
          }

          const readStream = fs.createReadStream(correctUploadedFilePath);

          // if everything is OK, let's pipe uploaded file to chosen compression
          switch (compressionType) {
            case 'gzip': {
              const gzip = zlib.createGzip();

              // let's get rid from whitespaces(if present) in original filename
              // because they can provoke an error:
              // ERR_RESPONSE_HEADERS_MULTIPLE_CONTENT_DISPOSITION

              const zippedFilePath =
                path.basename(correctUploadedFilePath) + '.gzip';

              mimeType = mime.contentType('gzip');

              pipeline(readStream, gzip, res, (error) => {
                res.statusCode = 500;
                res.end(`Error while piping: ${error}`);
              });

              // and if everything is OK, let's finalize
              // our Response with all needed headers
              res.statusCode = 200;

              res.setHeader(
                'Content-Disposition',
                `attachment; filename=${zippedFilePath}`,
              );
              res.setHeader('Content-Type', mimeType);
              res.setHeader('Content-Encoding', 'gzip');

              res.on('close', () => {
                readStream.destroy();
              });

              return;
            }

            case 'deflate': {
              const deflate = zlib.createDeflate();

              // let's get rid from whitespaces(if present) in original filename
              // because they can provoke an error:
              // ERR_RESPONSE_HEADERS_MULTIPLE_CONTENT_DISPOSITION

              const zippedFilePath =
                path.basename(correctUploadedFilePath) + '.dfl';

              mimeType = mime.contentType('deflate');

              pipeline(readStream, deflate, res, (error) => {
                res.statusCode = 500;
                res.end(`Error while piping: ${error}`);
              });

              // and if everything is OK, let's finalize
              // our Response with all needed headers
              res.statusCode = 200;

              res.setHeader(
                'Content-Disposition',
                `attachment; filename=${zippedFilePath}`,
              );
              res.setHeader('Content-Type', mimeType);
              res.setHeader('Content-Encoding', 'deflate');

              res.on('close', () => {
                readStream.destroy();
              });

              return;
            }

            case 'br': {
              const deflate = zlib.createBrotliCompress();

              // let's get rid from whitespaces(if present) in original filename
              // because they can provoke an error:
              // ERR_RESPONSE_HEADERS_MULTIPLE_CONTENT_DISPOSITION

              const zippedFilePath =
                path.basename(correctUploadedFilePath) + '.br';

              mimeType = mime.contentType('br');

              pipeline(readStream, deflate, res, (error) => {
                res.statusCode = 500;
                res.end(`Error while piping: ${error}`);
              });

              // and if everything is OK, let's finalize
              // our Response with all needed headers
              res.statusCode = 200;

              res.setHeader(
                'Content-Disposition',
                `attachment; filename=${zippedFilePath}`,
              );
              res.setHeader('Content-Type', mimeType);
              res.setHeader('Content-Encoding', 'br');

              res.on('close', () => {
                readStream.destroy();
              });

              return;
            }

            default: {
              res.statusCode = 400;
              res.end('Wrong type of compression sended!');
            }
          }
        });
      });

      return;
    }

    res.statusCode = 404;
    res.end('Not found');
  });

  return server;
}

module.exports = {
  createServer,
};
