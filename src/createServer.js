'use strict';

const http = require('http');
const zlib = require('zlib');
const { Readable } = require('stream');

const htmlForm = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>File Compression</title>
</head>
<body>
  <h1>File Compression</h1>
  <form action="/compress" method="post" enctype="multipart/form-data">
    <label for="file">Select file:</label>
    <input type="file" id="file" name="file" required><br><br>

    <label for="compressionType">Compression type:</label>
    <select id="compressionType" name="compressionType" required>
      <option value="gzip">gzip</option>
      <option value="deflate">deflate</option>
      <option value="br">br</option>
    </select><br><br>

    <button type="submit">Compress File</button>
  </form>
</body>
</html>
`;

function splitBuffer(buffer, separator) {
  const parts = [];
  let start = 0;
  let index;

  while ((index = buffer.indexOf(separator, start)) !== -1) {
    parts.push(buffer.slice(start, index));
    start = index + separator.length;
  }
  parts.push(buffer.slice(start));

  return parts;
}

function parseMultipartPart(partBuffer) {
  const headerDelimiter = '\r\n\r\n';
  const headerEndIndex = partBuffer.indexOf(headerDelimiter);

  if (headerEndIndex === -1) {
    return null;
  }

  const headersText = partBuffer.slice(0, headerEndIndex).toString('utf8');
  let content = partBuffer.slice(headerEndIndex + headerDelimiter.length);

  if (content.slice(-2).toString() === '\r\n') {
    content = content.slice(0, content.length - 2);
  }

  const headers = {};

  headersText.split('\r\n').forEach((line) => {
    const [key, value] = line.split(': ');

    if (key && value) {
      headers[key.toLowerCase()] = value;
    }
  });

  const disposition = headers['content-disposition'];

  if (!disposition) {
    return null;
  }

  const nameMatch = disposition.match(/name="([^"]+)"/);

  if (!nameMatch) {
    return null;
  }

  const fieldName = nameMatch[1];

  const filenameMatch = disposition.match(/filename="([^"]+)"/);
  const filename = filenameMatch ? filenameMatch[1] : undefined;

  return { fieldName, filename, content };
}

function parseMultipartData(bodyBuffer, boundary) {
  const parts = splitBuffer(bodyBuffer, Buffer.from(boundary));
  const formData = {};

  for (const part of parts) {
    if (part.length < 10) {
      continue;
    }

    const parsedPart = parseMultipartPart(part);

    if (!parsedPart) {
      continue;
    }

    if (parsedPart.fieldName === 'file') {
      formData.file = {
        filename: parsedPart.filename,
        content: parsedPart.content,
      };
    } else if (parsedPart.fieldName === 'compressionType') {
      formData.compressionType = parsedPart.content.toString().trim();
    }
  }

  return formData;
}

function getCompressionStream(type) {
  switch (type) {
    case 'gzip':
      return { stream: zlib.createGzip(), extension: '.gzip' };
    case 'deflate':
      return { stream: zlib.createDeflate(), extension: '.deflate' };
    case 'br':
      if (typeof zlib.createBrotliCompress === 'function') {
        return { stream: zlib.createBrotliCompress(), extension: '.br' };
      }
      throw new Error('Brotli compression not supported');
    default:
      throw new Error('Unsupported compression type');
  }
}

function createServer() {
  return http.createServer((req, res) => {
    const { method, url } = req;

    if (url === '/' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(htmlForm);

      return;
    }

    if (url === '/compress') {
      if (method !== 'POST') {
        res.writeHead(400);
        res.end('GET method not allowed on /compress');

        return;
      }

      const contentType = req.headers['content-type'];

      if (!contentType || !contentType.includes('multipart/form-data')) {
        res.writeHead(400);
        res.end('Invalid form data');

        return;
      }

      const boundaryMatch = contentType.match(
        /boundary=(?:"?)(.+?)(?:"?)(;|$)/,
      );

      if (!boundaryMatch) {
        res.writeHead(400);
        res.end('No boundary found in multipart/form-data');

        return;
      }

      const boundary = '--' + boundaryMatch[1];

      const chunks = [];

      req.on('data', (chunk) => chunks.push(chunk));

      req.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        const { file, compressionType } = parseMultipartData(
          bodyBuffer,
          boundary,
        );

        if (!file || !compressionType) {
          res.writeHead(400);
          res.end('Missing file or compressionType field');

          return;
        }

        let compression;

        try {
          compression = getCompressionStream(compressionType);
        } catch (error) {
          res.writeHead(400);
          res.end(error.message);

          return;
        }

        const fileStream = Readable.from(file.content);

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${file.filename + compression.extension}`,
        });
        fileStream.pipe(compression.stream).pipe(res);
      });

      req.on('error', () => {
        res.writeHead(500);
        res.end('Server error');
      });

      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });
}

module.exports = { createServer };
