'use strict';

const http = require('http');
const { Readable, pipeline } = require('stream');
const zlib = require('zlib');

const SUPPORTED_TYPES = new Set(['gzip', 'deflate', 'br']);

function getBoundary(contentType = '') {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  return match ? match[1] || match[2] : null;
}

function parseHeaders(headerText) {
  const headers = {};
  const lines = headerText.split('\r\n');

  for (const line of lines) {
    const idx = line.indexOf(':');

    if (idx === -1) {
      continue;
    }

    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();

    headers[key] = val;
  }

  return headers;
}

function parseContentDisposition(value = '') {
  const out = {};
  const parts = value.split(';').map((p) => p.trim());

  for (const part of parts) {
    const eq = part.indexOf('=');

    if (eq === -1) {
      continue;
    }

    const k = part.slice(0, eq).trim().toLowerCase();
    let v = part.slice(eq + 1).trim();

    if (v.startsWith('"') && v.endsWith('"')) {
      v = v.slice(1, -1);
    }

    out[k] = v;
  }

  return out;
}

function parseMultipart(bodyBuffer, boundary) {
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const parts = [];

  let pos = bodyBuffer.indexOf(boundaryBuf);

  if (pos === -1) {
    return parts;
  }

  pos += boundaryBuf.length;

  while (pos < bodyBuffer.length) {
    if (bodyBuffer[pos] === 45 && bodyBuffer[pos + 1] === 45) {
      break;
    }

    if (bodyBuffer[pos] === 13 && bodyBuffer[pos + 1] === 10) {
      pos += 2;
    }

    const next = bodyBuffer.indexOf(boundaryBuf, pos);

    if (next === -1) {
      break;
    }

    let partBuf = bodyBuffer.slice(pos, next);

    if (
      partBuf.length >= 2 &&
      partBuf[partBuf.length - 2] === 13 &&
      partBuf[partBuf.length - 1] === 10
    ) {
      partBuf = partBuf.slice(0, -2);
    }

    const sep = Buffer.from('\r\n\r\n');
    const sepIdx = partBuf.indexOf(sep);

    if (sepIdx === -1) {
      pos = next + boundaryBuf.length;
      continue;
    }

    const headerText = partBuf.slice(0, sepIdx).toString('utf8');
    const headers = parseHeaders(headerText);
    const body = partBuf.slice(sepIdx + sep.length);

    parts.push({ headers, body });

    pos = next + boundaryBuf.length;
  }

  return parts;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function htmlPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Compression App</title>
</head>
<body>
  <form action="/compress" method="POST" enctype="multipart/form-data">
    <input type="file" name="file" />
    <select name="compressionType">
      <option value="gzip">gzip</option>
      <option value="deflate">deflate</option>
      <option value="br">br</option>
    </select>
    <button type="submit">Compress</button>
  </form>
</body>
</html>`;
}

function createCompressor(type) {
  if (type === 'gzip') {
    return zlib.createGzip();
  }

  if (type === 'deflate') {
    return zlib.createDeflate();
  }

  if (type === 'br') {
    return zlib.createBrotliCompress();
  }

  return null;
}

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/') {
      const page = htmlPage();

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Length', Buffer.byteLength(page));
      res.end(page);

      return;
    }

    if (url.pathname !== '/compress') {
      res.statusCode = 404;
      res.end();

      return;
    }

    if (req.method === 'GET') {
      res.statusCode = 400;
      res.end();

      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 404;
      res.end();

      return;
    }

    const contentType = req.headers['content-type'] || '';
    const boundary = getBoundary(contentType);

    if (!boundary) {
      res.statusCode = 400;
      res.end();

      return;
    }

    let bodyBuffer;

    try {
      bodyBuffer = await readBody(req);
    } catch {
      res.statusCode = 400;
      res.end();

      return;
    }

    const parts = parseMultipart(bodyBuffer, boundary);

    let fileBuffer = null;
    let filename = null;
    let compressionType = null;

    for (const part of parts) {
      const cd = part.headers['content-disposition'] || '';
      const cdParsed = parseContentDisposition(cd);

      if (cdParsed.name === 'file') {
        if (cdParsed.filename) {
          filename = cdParsed.filename;
        }
        fileBuffer = part.body;
      } else if (cdParsed.name === 'compressionType') {
        compressionType = part.body.toString('utf8').trim();
      }
    }

    if (!fileBuffer || !filename || !compressionType) {
      res.statusCode = 400;
      res.end();

      return;
    }

    if (!SUPPORTED_TYPES.has(compressionType)) {
      res.statusCode = 400;
      res.end();

      return;
    }

    const compressor = createCompressor(compressionType);

    if (!compressor) {
      res.statusCode = 400;
      res.end();

      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/octet-stream');

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${filename}.${compressionType}`,
    );

    pipeline(Readable.from(fileBuffer), compressor, res, () => {});
  });
}

module.exports = {
  createServer,
};
