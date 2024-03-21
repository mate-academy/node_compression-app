/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { formidable } = require('formidable');

const getCompressionStream = require('./helpers/getCompressionStream');
const getFilename = require('./helpers/getFilename');
const getCompressionType = require('./helpers/getCompressionType');
const getContentType = require('./helpers/getContentType');

function createServer() {
  const server = new http.Server();

  server.on('request', handleRequest);
  server.on('error', handleServerError);

  return server;

  async function handleRequest(req, res) {
    try {
      const { method, url } = req;
      const urlObj = new URL(url, `http://${req.headers.host}`);
      const pathname = urlObj.pathname.slice(1) || 'index.html';
      const pathToFile = path.resolve('public', pathname);

      if (method.toLowerCase() === 'get' && url === '/compress') {
        sendErrorResponse(res, 400, 'BAD REQUEST');

        return;
      }

      if (method.toLowerCase() === 'post' && url === '/compress') {
        await handleCompressionRequest(req, res);

        return;
      }

      if (['/', '/index.html'].includes(url)) {
        serveStaticFile(pathToFile, res);

        return;
      }

      sendErrorResponse(res, 404, 'Not found');
    } catch (error) {
      console.error(error);
      sendErrorResponse(res, error.httpCode || 500, String(error));
    }
  }

  async function handleCompressionRequest(req, res) {
    const form = formidable({});

    const [fields, files] = await form.parse(req);

    if (!fields.compressionType) {
      throw new Error('Compression type not found');
    }

    const file = files.multipleFiles[0];
    const contentType = getContentType(file.originalFilename);
    const filename = getFilename(file.originalFilename, fields);
    const compressionType = getCompressionType(fields);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Encoding', compressionType);

    const readstream = fs.createReadStream(file.filepath);
    const compressedStream = getCompressionStream(fields);

    readstream.pipe(compressedStream).pipe(res);

    res.on('close', () => {
      cleanupFile(file.filepath, res);
    });
  }

  function serveStaticFile(pathToFile, res) {
    if (!fs.existsSync(pathToFile)) {
      sendErrorResponse(res, 404, 'Not found');

      return;
    }

    const fileStream = fs.createReadStream(pathToFile);

    fileStream.on('error', () => {
      sendErrorResponse(res, 500, 'Internal Server Error');
    });

    fileStream.pipe(res);
    fileStream.on('close', () => fileStream.destroy());
  }

  function cleanupFile(filepath, res) {
    fs.unlink(filepath, (err) => {
      if (err) {
        console.error(err);
        sendErrorResponse(res, 500, 'Internal Server Error');
      }
    });
  }

  function sendErrorResponse(res, statusCode, message) {
    res.statusCode = statusCode;
    res.end(message);
  }

  function handleServerError(error) {
    console.error('Server error:', error);
  }
}

module.exports = {
  createServer,
};
