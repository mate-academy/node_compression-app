'use strict';

const http = require('http');
const zlib = require('zlib');
const { Readable } = require('stream');

const COMPRESSION_TYPES = {
  gzip: { create: () => zlib.createGzip(), extension: 'gz' },
  deflate: { create: () => zlib.createDeflate(), extension: 'dfl' },
  br: { create: () => zlib.createBrotliCompress(), extension: 'br' },
};

const FORM_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>File Compressor</title></head>
<body>
  <h1>File Compressor</h1>
  <form method="POST" action="/compress" enctype="multipart/form-data">
    <label>File: <input type="file" name="file" required></label><br>
    <label>Compression type:
      <select name="compressionType">
        <option value="gzip">gzip</option>
        <option value="deflate">deflate</option>
        <option value="br">br</option>
      </select>
    </label><br>
    <button type="submit">Compress</button>
  </form>
</body>
</html>`;

function sendError(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain');
  res.end(message);
}

function getBoundary(contentType) {
  const match = contentType.match(/boundary=(.+)$/);

  return match ? match[1] : null;
}

function parseMultipart(buffer, boundary) {
  const fields = {};
  const sep = Buffer.from('--' + boundary);
  const parts = [];

  let start = 0;

  while (start < buffer.length) {
    const sepIdx = buffer.indexOf(sep, start);

    if (sepIdx === -1) {
      break;
    }

    const afterSep = sepIdx + sep.length;

    if (buffer[afterSep] === 45 && buffer[afterSep + 1] === 45) {
      break;
    }

    const headerStart = afterSep + 2;
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), headerStart);

    if (headerEnd === -1) {
      break;
    }

    const headerStr = buffer.slice(headerStart, headerEnd).toString();
    const bodyStart = headerEnd + 4;
    const nextSep = buffer.indexOf(sep, bodyStart);
    const bodyEnd = nextSep - 2;
    const body = buffer.slice(bodyStart, bodyEnd);

    parts.push({ headers: headerStr, body });
    start = nextSep;
  }

  for (const part of parts) {
    const nameMatch = part.headers.match(/name="([^"]+)"/);
    const filenameMatch = part.headers.match(/filename="([^"]+)"/);

    if (!nameMatch) {
      continue;
    }

    const name = nameMatch[1];

    if (filenameMatch) {
      fields[name] = { filename: filenameMatch[1], data: part.body };
    } else {
      fields[name] = part.body.toString();
    }
  }

  return fields;
}

function handleCompress(req, res) {
  const contentType = req.headers['content-type'] || '';
  const boundary = getBoundary(contentType);

  if (!boundary) {
    return sendError(res, 400, 'Bad Request: multipart/form-data required.');
  }

  const chunks = [];

  req.on('data', (chunk) => chunks.push(chunk));

  req.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const fields = parseMultipart(buffer, boundary);

    const file = fields['file'];
    const compressionType = fields['compressionType'];

    if (!file || !file.filename) {
      return sendError(res, 400, 'Bad Request: file is required.');
    }

    if (!compressionType) {
      return sendError(res, 400, 'Bad Request: compressionType is required.');
    }

    const compression = COMPRESSION_TYPES[compressionType];

    if (!compression) {
      return sendError(
        res,
        400,
        `Bad Request: unsupported compression type "${compressionType}".`,
      );
    }

    const outputFilename = `${file.filename}.${compression.extension}`;

    res.statusCode = 200;

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${outputFilename}`,
    );
    res.setHeader('Content-Type', 'application/octet-stream');

    const readable = new Readable();

    readable.push(file.data);
    readable.push(null);

    readable.pipe(compression.create()).pipe(res);
  });

  req.on('error', () => sendError(res, 400, 'Bad Request: stream error.'));
}

function createServer() {
  return http.createServer((req, res) => {
    const { method, url } = req;

    if (method === 'GET' && url === '/') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end(FORM_HTML);

      return;
    }

    if (url === '/compress') {
      if (method !== 'POST') {
        return sendError(res, 400, 'Bad Request: use POST method.');
      }

      return handleCompress(req, res);
    }

    sendError(res, 404, 'Not Found');
  });
}

module.exports = { createServer };
