'use strict';

const http = require('http');
const { Readable } = require('stream');
const zlib = require('zlib');

const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compression App</title>
  </head>
  <body>
    <form action="/compress" method="POST" enctype="multipart/form-data">
      <input type="file" name="file" required>
      <select name="compressionType" required>
        <option value="gzip">gzip</option>
        <option value="deflate">deflate</option>
        <option value="br">br</option>
      </select>
      <button type="submit">Compress</button>
    </form>
  </body>
</html>`;

const compressionStreams = {
  gzip: () => zlib.createGzip(),
  deflate: () => zlib.createDeflate(),
  br: () => zlib.createBrotliCompress(),
};

function sendTextResponse(res, statusCode, message) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
  res.end(message);
}

function getBoundary(contentType = '') {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  return match ? match[1] || match[2] : null;
}

function collectRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseMultipartFormData(bodyBuffer, boundary) {
  const normalizedBody = bodyBuffer.toString('latin1');
  const parts = normalizedBody
    .split(`--${boundary}`)
    .slice(1, -1)
    .map((part) => part.replace(/^\r\n|\r\n$/g, ''));
  const parsedData = {};

  for (const part of parts) {
    const [rawHeaders, rawContent] = part.split('\r\n\r\n');

    if (!rawHeaders || rawContent === undefined) {
      continue;
    }

    const nameMatch = rawHeaders.match(/name="([^"]+)"/i);

    if (!nameMatch) {
      continue;
    }

    const fieldName = nameMatch[1];
    const content = rawContent.replace(/\r\n$/g, '');
    const filenameMatch = rawHeaders.match(/filename="([^"]*)"/i);

    if (filenameMatch) {
      parsedData[fieldName] = {
        filename: filenameMatch[1],
        content: Buffer.from(content, 'latin1'),
      };
    } else {
      parsedData[fieldName] = content;
    }
  }

  return parsedData;
}

async function handleCompressRequest(req, res) {
  const boundary = getBoundary(req.headers['content-type']);

  if (!boundary) {
    sendTextResponse(res, 400, 'Invalid form data');

    return;
  }

  const body = await collectRequestBody(req);
  const formData = parseMultipartFormData(body, boundary);
  const file = formData.file;
  const compressionType = formData.compressionType;

  if (
    !file ||
    !file.filename ||
    !Buffer.isBuffer(file.content) ||
    !compressionType
  ) {
    sendTextResponse(res, 400, 'Invalid form data');

    return;
  }

  const createCompressionStream = compressionStreams[compressionType];

  if (!createCompressionStream) {
    sendTextResponse(res, 400, 'Unsupported compression type');

    return;
  }

  const sourceStream = Readable.from(file.content);
  const compressionStream = createCompressionStream();

  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename=${file.filename}.${compressionType}`,
  });

  sourceStream.on('error', () => {
    if (!res.headersSent) {
      sendTextResponse(res, 500, 'Failed to read file');
    } else {
      res.destroy();
    }
  });

  compressionStream.on('error', () => {
    if (!res.headersSent) {
      sendTextResponse(res, 500, 'Compression failed');
    } else {
      res.destroy();
    }
  });

  sourceStream.pipe(compressionStream).pipe(res);
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
      });
      res.end(HTML_PAGE);

      return;
    }

    if (req.url === '/compress' && req.method === 'GET') {
      sendTextResponse(res, 400, 'GET method is not supported for /compress');

      return;
    }

    if (req.url === '/compress' && req.method === 'POST') {
      handleCompressRequest(req, res).catch(() => {
        if (!res.headersSent) {
          sendTextResponse(res, 400, 'Invalid form data');
        } else {
          res.destroy();
        }
      });

      return;
    }

    sendTextResponse(res, 404, 'Not found');
  });
}

module.exports = {
  createServer,
};
