'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const stream = require('node:stream');
const zlib = require('node:zlib');
const Busboy = require('busboy');

const compressionTypes = {
  gzip: {
    extension: '.gz',
    createStream: () => zlib.createGzip(),
  },
  deflate: {
    extension: '.dfl',
    createStream: () => zlib.createDeflate(),
  },
  br: {
    extension: '.br',
    createStream: () => zlib.createBrotliCompress(),
  },
};

function sendError(res, statusCode, message) {
  if (res.headersSent || res.writableEnded) {
    return;
  }

  res.writeHead(statusCode, { 'Content-Type': 'text/plain' });
  res.end(message);
}

function handleCompress(req, res) {
  if (req.method !== 'POST') {
    sendError(res, 400, 'Only POST requests are allowed for /compress');

    return;
  }

  const contentType = req.headers['content-type'] || '';

  if (!contentType.includes('multipart/form-data')) {
    sendError(res, 400, 'Invalid form');

    return;
  }

  let busboy;

  try {
    busboy = Busboy({ headers: req.headers });
  } catch (error) {
    sendError(res, 400, 'Invalid form');

    return;
  }

  let compressionType = null;
  let fileName = null;
  let fileReceived = false;
  const fileChunks = [];
  let fileEnded = false;
  let formFinished = false;
  let responded = false;

  function tryRespond() {
    if (responded || !formFinished) {
      return;
    }

    // If a file part was received, wait for it to finish streaming in.
    if (fileReceived && !fileEnded) {
      return;
    }

    responded = true;

    const compressionConfig = compressionTypes[compressionType];

    if (!fileReceived || !fileName || !compressionType || !compressionConfig) {
      sendError(res, 400, 'Invalid form');

      return;
    }

    const { extension, createStream } = compressionConfig;
    const outputName = `${fileName}${extension}`;
    const compressor = createStream();
    const source = stream.Readable.from(Buffer.concat(fileChunks));

    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename=${outputName}`,
    });

    compressor.on('error', () => {
      if (!res.writableEnded) {
        res.destroy();
      }
    });

    source.pipe(compressor).pipe(res);
  }

  busboy.on('field', (name, value) => {
    if (name === 'compressionType') {
      compressionType = value;
    }
  });

  busboy.on('file', (name, fileStream, info) => {
    if (name !== 'file') {
      fileStream.resume();

      return;
    }

    fileReceived = true;
    fileName = info && info.filename;

    // Consume the stream right away (either via 'data' or .resume()) -
    // otherwise busboy will never finish parsing the rest of the form.
    fileStream.on('data', (chunk) => {
      fileChunks.push(chunk);
    });

    fileStream.on('end', () => {
      fileEnded = true;
      tryRespond();
    });
  });

  busboy.on('finish', () => {
    formFinished = true;
    tryRespond();
  });

  busboy.on('error', () => {
    responded = true;
    sendError(res, 400, 'Invalid form');
  });

  req.on('aborted', () => {
    responded = true;
  });

  req.pipe(busboy);
}

function createServer() {
  const server = new http.Server();

  server.on('request', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/') {
      const filePath = path.join(process.cwd(), 'src', 'index.html');

      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          sendError(res, 404, 'Not found');

          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(filePath).pipe(res);
      });

      return;
    }

    if (url.pathname === '/compress') {
      handleCompress(req, res);

      return;
    }

    sendError(res, 404, 'Not found');
  });

  return server;
}

module.exports = {
  createServer,
};
