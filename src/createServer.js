/* eslint-disable no-console */
/* eslint-disable curly */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const pipeline = require('node:stream').pipeline;
const zlib = require('node:zlib');
const formidable = require('formidable');
const mime = require('mime-types');

function createServer() {
  return http.createServer(async (req, res) => {
    if (req.url === '/' && req.method === 'GET') {
      const filePath = path.join(__dirname, 'index.html');

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data);
        }
      });
    } else if (req.method !== 'POST' && req.url === '/compress') {
      res.statusCode = 400;
      res.end('Bad Request: Invalid request method.');
    } else if (req.method === 'POST' && req.url === '/compress') {
      const form = new formidable.IncomingForm();

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.statusCode = 500;
          res.end('Server Error: Failed to parse form data.');

          return;
        }

        const compressionTypeArray = fields.compressionType;
        const compressionType = Array.isArray(compressionTypeArray)
          ? compressionTypeArray[0]
          : undefined;

        const uploadedFileArray = files.file;
        const uploadedFile = Array.isArray(uploadedFileArray)
          ? uploadedFileArray[0]
          : undefined;

        if (!uploadedFile || !uploadedFile.filepath || !compressionType) {
          res.statusCode = 400;
          res.end('Bad Request: File or compression type missing or invalid.');

          return;
        }

        let compressionStream;
        let fileExtension;

        switch (compressionType) {
          case 'gzip':
            compressionStream = zlib.createGzip();
            fileExtension = '.gzip';
            break;
          case 'deflate':
            compressionStream = zlib.createDeflate();
            fileExtension = '.deflate';
            break;
          case 'br':
            compressionStream = zlib.createBrotliCompress();
            fileExtension = '.br';

            break;
          default:
            res.statusCode = 400;
            res.end('Bad Request: Unsupported compression type.');

            fs.unlink(uploadedFile.filepath, (unlinkErr) => {
              if (unlinkErr)
                console.error('Error deleting temp file:', unlinkErr);
            });

            return;
        }

        const fileReadStream = fs.createReadStream(uploadedFile.filepath);

        const originalFileName =
          uploadedFile.originalFilename || 'uploaded_file';
        const baseName = path.basename(
          originalFileName,
          path.extname(originalFileName),
        );

        const newFileName = `${baseName}${path.extname(originalFileName)}${fileExtension}`;
        const originalMimeType =
          uploadedFile.mimetype ||
          mime.contentType(path.extname(originalFileName)) ||
          'application/octet-stream';

        res.statusCode = 200;
        res.setHeader('Content-Type', originalMimeType);

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${newFileName}`,
        );

        pipeline(fileReadStream, compressionStream, res, (pipelineErr) => {
          if (pipelineErr) {
            console.error('Pipeline failed during compression:', pipelineErr);

            if (!res.headersSent) {
              res.statusCode = 500;
              res.end('Server Error during file compression.');
            } else {
              res.end();
            }
          }

          fs.unlink(uploadedFile.filepath, (unlinkErr) => {
            if (unlinkErr)
              console.error('Error deleting temporary file:', unlinkErr);
          });

          res.on('close', () => {
            fileReadStream.destroy();
            compressionStream.destroy();
          });
        });
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });
}

module.exports = {
  createServer,
};
