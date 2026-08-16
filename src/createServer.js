'use strict';

const http = require('http');
const zlib = require('zlib');

const compressionTypes = {
  gzip: {
    extension: 'gz',
    createStream: () => zlib.createGzip(),
  },
  deflate: {
    extension: 'dfl',
    createStream: () => zlib.createDeflate(),
  },
  br: {
    extension: 'br',
    createStream: () => zlib.createBrotliCompress(),
  },
};

function parseMultipart(body, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = [];

  let start = body.indexOf(boundaryBuffer);

  while (start !== -1) {
    const next = body.indexOf(boundaryBuffer, start + boundaryBuffer.length);

    if (next === -1) {
      break;
    }

    const part = body.subarray(start + boundaryBuffer.length, next);

    if (part.length > 4) {
      parts.push(part);
    }

    start = next;
  }

  const result = {};

  parts.forEach((part) => {
    const headerEnd = part.indexOf('\r\n\r\n');

    if (headerEnd === -1) {
      return;
    }

    const headers = part.subarray(0, headerEnd).toString();
    let content = part.subarray(headerEnd + 4);

    if (content.subarray(-2).toString() === '\r\n') {
      content = content.subarray(0, -2);
    }

    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);

    if (!nameMatch) {
      return;
    }

    const { 1: name } = nameMatch;

    if (filenameMatch) {
      result[name] = {
        filename: filenameMatch[1],
        content,
      };
    } else {
      result[name] = content.toString();
    }
  });

  return result;
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.url === '/') {
      res.statusCode = 200;
      res.end();

      return;
    }

    if (req.url !== '/compress') {
      res.statusCode = 404;
      res.end();

      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 400;
      res.end();

      return;
    }

    const contentType = req.headers['content-type'];
    const boundaryMatch = contentType?.match(/boundary=(?:"([^"]+)"|([^;]+))/);

    if (!boundaryMatch) {
      res.statusCode = 400;
      res.end();

      return;
    }

    const boundary = boundaryMatch[1] || boundaryMatch[2];
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const formData = parseMultipart(body, boundary);

      const file = formData.file;
      const compressionType = formData.compressionType;

      if (!file || !compressionType) {
        res.statusCode = 400;
        res.end();

        return;
      }

      const compression = compressionTypes[compressionType];

      if (!compression) {
        res.statusCode = 400;
        res.end();

        return;
      }

      res.statusCode = 200;

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${file.filename}.${compression.extension}`,
      );

      const compressor = compression.createStream();

      compressor.pipe(res);
      compressor.end(file.content);
    });
  });
}

module.exports = {
  createServer,
};
