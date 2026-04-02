'use strict';

const http = require('http');
const { Readable } = require('stream');
const zlib = require('zlib');

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

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function getBoundary(contentType = '') {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  return match ? match[1] || match[2] : null;
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
  const first = bodyBuffer.indexOf(boundaryToken, pos);

  if (first !== 0) {
    return null;
  }

  pos = first;

  while (pos < bodyBuffer.length) {
    const boundaryStart = bodyBuffer.indexOf(boundaryToken, pos);

    if (boundaryStart === -1) {
      break;
    }

    let partStart = boundaryStart + boundaryToken.length;

    // eslint-disable-next-line
    const isFinal =
      bodyBuffer.slice(partStart, partStart + 2).toString() === '--';

    if (isFinal) {
      break;
    }

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

    const nextBoundary = bodyBuffer.indexOf(boundaryToken, contentStart);

    if (nextBoundary === -1) {
      return null;
    }

    const rawContent = bodyBuffer.slice(contentStart, nextBoundary);
    const content = trimCrlf(rawContent);

    if (cd.filename !== null) {
      result.file = {
        fieldName: cd.name,
        filename: cd.filename,
        buffer: content,
      };
    } else {
      result.fields[cd.name] = content.toString('utf8').trim();
    }

    pos = nextBoundary;
  }

  return result;
}

function createServer() {
  return http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
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

    const contentType = req.headers['content-type'] || '';
    const boundary = getBoundary(contentType);

    if (!boundary) {
      res.statusCode = 400;
      res.end();

      return;
    }

    let body;

    try {
      body = await readRequestBody(req);
    } catch (error) {
      res.statusCode = 400;
      res.end();

      return;
    }

    const parsed = parseMultipart(body, boundary);

    if (!parsed) {
      res.statusCode = 400;
      res.end();

      return;
    }

    const compressionType = parsed.fields.compressionType;
    const file = parsed.file;

    if (
      !compressionType ||
      !file ||
      file.fieldName !== 'file' ||
      !file.filename
    ) {
      res.statusCode = 400;
      res.end();

      return;
    }

    if (!compressors[compressionType]) {
      res.statusCode = 400;
      res.end();

      return;
    }

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
