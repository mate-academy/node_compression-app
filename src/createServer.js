'use strict';

const formidable = require('formidable');
const { createReadStream, createWriteStream, unlink } = require('node:fs');
const { Server } = require('node:http');
const path = require('node:path');
const { pipeline } = require('node:stream');
const zlib = require('node:zlib');

function createServer() {
  const server = new Server();

  server.on('request', async (req, res) => {
    const { pathname } = new URL(
      req.url || '',
      `http://${req.headers.host || 'localhost'}`,
    );

    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html' });

      const readStream = createReadStream(
        path.join(__dirname, 'public', 'index.html'),
      );

      pipeline(readStream, res, (err) => {
        if (err) {
          sendResponse(res, 500, 'Error reading index.html');
        }
      });

      return;
    }

    if (pathname === '/compress') {
      if (req.method === 'GET') {
        return sendResponse(
          res,
          400,
          'GET requests are not allowed on /compress',
        );
      }

      await handleFileCompression(req, res);

      return;
    }

    sendResponse(res, 404, 'Not Found');
  });

  return server;
}

function sendResponse(res, statusCode, message) {
  res.writeHead(statusCode, { 'content-type': 'text/plain' });
  res.end(message);
}

async function handleFileCompression(req, res) {
  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err || !fields.compressionType || !files.file) {
      return sendResponse(res, 400, 'Invalid form submission');
    }

    const compressionType = Array.isArray(fields.compressionType)
      ? fields.compressionType[0]
      : fields.compressionType;
    const fileObj = Array.isArray(files.file) ? files.file[0] : files.file;
    const filePath = fileObj.filepath;
    const originalFileName = fileObj.originalFilename;

    let compressedStream;
    let extension;

    switch (compressionType) {
      case 'gzip':
        compressedStream = zlib.createGzip();
        extension = '.gzip';
        break;
      case 'deflate':
        compressedStream = zlib.createDeflate();
        extension = '.deflate';
        break;
      case 'br':
        compressedStream = zlib.createBrotliCompress();
        extension = '.br';
        break;
      default:
        return sendResponse(res, 400, 'Unsupported compression type');
    }

    const compressedFileName = originalFileName + extension;
    const compressedFilePath = path.join(
      __dirname,
      'public',
      compressedFileName,
    );
    const writeStream = createWriteStream(compressedFilePath);

    try {
      await new Promise((resolve, reject) => {
        pipeline(
          createReadStream(filePath),
          compressedStream,
          writeStream,
          (errPromise) => (errPromise ? reject(errPromise) : resolve()),
        );
      });

      res.writeHead(200, {
        'content-disposition': `attachment; filename=${compressedFileName}`,
      });

      const readStream = createReadStream(compressedFilePath);

      pipeline(readStream, res, (errSendFile) => {
        unlink(compressedFilePath, (unlinkErr) => {
          if (unlinkErr) {
            return unlinkErr;
          }
        });

        if (errSendFile) {
          return sendResponse(res, 500, 'Error sending compressed file');
        }
      });
    } catch (error) {
      sendResponse(res, 500, 'Error compressing file');
    }
  });
}

module.exports = {
  createServer,
};
