'use strict';

const http = require('http');
const zlib = require('zlib');
const { Readable } = require('stream');

const compressors = {
  gzip: zlib.createGzip,
  deflate: zlib.createDeflate,
  br: zlib.createBrotliCompress,
};

const extensions = {
  gzip: '.gzip',
  deflate: '.deflate',
  br: '.br',
};

function getBoundary(contentType = '') {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  return match ? match[1] || match[2] : null;
}

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function parsePartHeaders(headerText) {
  const headers = {};

  headerText.split('\r\n').forEach((line) => {
    const idx = line.indexOf(':');

    if (idx === -1) {
      return;
    }

    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    headers[key] = value;
  });

  return headers;
}

function parseContentDisposition(value = '') {
  // example:
  // form-data; name="file"; filename="test.txt"
  const nameMatch = value.match(/name="([^"]+)"/i);
  const filenameMatch = value.match(/filename="([^"]*)"/i);

  return {
    name: nameMatch ? nameMatch[1] : null,
    filename: filenameMatch ? filenameMatch[1] : null,
  };
}

function trimCrlf(buf) {
  if (buf.length >= 2 && buf.slice(-2).toString() === '\r\n') {
    return buf.slice(0, -2);
  }

  return buf;
}

function parseMultipart(bodyBuffer, boundary) {
  const boundaryToken = Buffer.from(`--${boundary}`);
  const result = {
    fields: {},
    file: null,
  };

  let pos = 0;

  // Must start with boundary
  const first = bodyBuffer.indexOf(boundaryToken, pos);

  if (first !== 0) {
    return null;
  }

  pos = first;

  while (pos < bodyBuffer.length) {
    // Find next boundary
    const boundaryStart = bodyBuffer.indexOf(boundaryToken, pos);

    if (boundaryStart === -1) {
      break;
    }

    let partStart = boundaryStart + boundaryToken.length;

    // Check for final boundary: "--"
    const isFinal =
      bodyBuffer.slice(partStart, partStart + 2).toString() === '--';

    if (isFinal) {
      break;
    }

    // Skip leading CRLF after boundary
    if (bodyBuffer.slice(partStart, partStart + 2).toString() === '\r\n') {
      partStart += 2;
    }

    const headersEnd = bodyBuffer.indexOf(Buffer.from('\r\n\r\n'), partStart);

    if (headersEnd === -1) {
      return null;
    }

    const headerText = bodyBuffer.slice(partStart, headersEnd).toString('utf8');
    const headers = parsePartHeaders(headerText);

    const cd = parseContentDisposition(headers['content-disposition']);

    if (!cd.name) {
      return null;
    }

    const contentStart = headersEnd + 4;

    // The content ends right before the next boundary
    const nextBoundary = bodyBuffer.indexOf(boundaryToken, contentStart);

    if (nextBoundary === -1) {
      return null;
    }

    const rawContent = bodyBuffer.slice(contentStart, nextBoundary);
    const content = trimCrlf(rawContent);

    if (cd.filename !== null) {
      // file part
      result.file = {
        fieldName: cd.name,
        filename: cd.filename,
        buffer: content,
      };
    } else {
      // normal field
      result.fields[cd.name] = content.toString('utf8').trim();
    }

    pos = nextBoundary;
  }

  return result;
}

function createServer() {
  return http.createServer(async (req, res) => {
    // Serve HTML page (optional for tests, but useful and required by mentor)
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200);
      res.end();

      return;
    }

    if (req.url !== '/compress') {
      res.writeHead(404);
      res.end();

      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(400);
      res.end();

      return;
    }

    const contentType = req.headers['content-type'] || '';
    const boundary = getBoundary(contentType);

    if (!boundary) {
      res.writeHead(400);
      res.end();

      return;
    }

    let body;

    try {
      body = await readRequestBody(req);
    } catch (e) {
      res.writeHead(400);
      res.end();

      return;
    }

    const parsed = parseMultipart(body, boundary);

    if (!parsed) {
      res.writeHead(400);
      res.end();

      return;
    }

    const compressionType = parsed.fields.compressionType;
    const file = parsed.file;

    // invalid form
    if (
      !compressionType ||
      !file ||
      file.fieldName !== 'file' ||
      !file.filename
    ) {
      res.writeHead(400);
      res.end();

      return;
    }

    // unsupported type
    if (!compressors[compressionType]) {
      res.writeHead(400);
      res.end();

      return;
    }

    // stream compression
    const compressor = compressors[compressionType]();
    const outName = `${file.filename}${extensions[compressionType]}`;

    res.writeHead(200, {
      'Content-Disposition': `attachment; filename=${outName}`,
    });

    Readable.from(file.buffer).pipe(compressor).pipe(res);
  });
}

module.exports = {
  createServer,
};
