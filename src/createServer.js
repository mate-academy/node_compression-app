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

function bufferSplit(buffer, separator) {
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

function createServer() {
  return http.createServer((req, res) => {
    const { method, url: reqUrl } = req;

    if (reqUrl === '/' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(htmlForm);

      return;
    }

    if (reqUrl === '/compress') {
      if (method === 'GET') {
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

      req.on('data', (chunk) => {
        chunks.push(chunk);
      });

      req.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        const parts = bufferSplit(bodyBuffer, Buffer.from(boundary));

        let fileField = null;
        let compTypeField = null;

        for (const part of parts) {
          if (part.length < 10) {
            continue;
          }

          const headerEnd = part.indexOf('\r\n\r\n');

          if (headerEnd === -1) {
            continue;
          }

          const headerPart = part.slice(0, headerEnd).toString('utf8');
          let content = part.slice(headerEnd + 4);

          if (content.slice(-2).toString() === '\r\n') {
            content = content.slice(0, content.length - 2);
          }

          const headers = {};

          headerPart.split('\r\n').forEach((line) => {
            const [key, value] = line.split(': ');

            if (key && value) {
              headers[key.toLowerCase()] = value;
            }
          });

          if (!headers['content-disposition']) {
            continue;
          }

          const disposition = headers['content-disposition'];

          const nameMatch = disposition.match(/name="([^"]+)"/);

          if (!nameMatch) {
            continue;
          }

          const fieldName = nameMatch[1];

          if (fieldName === 'file') {
            const filenameMatch = disposition.match(/filename="([^"]+)"/);

            if (!filenameMatch) {
              continue;
            }

            const filename = filenameMatch[1];

            fileField = { filename, content };
          } else if (fieldName === 'compressionType') {
            compTypeField = content.toString().trim();
          }
        }

        if (!fileField || !compTypeField) {
          res.writeHead(400);
          res.end('Missing file or compressionType field');

          return;
        }

        let compressor;
        let ext;

        if (compTypeField === 'gzip') {
          compressor = zlib.createGzip();
          ext = '.gzip';
        } else if (compTypeField === 'deflate') {
          compressor = zlib.createDeflate();
          ext = '.deflate';
        } else if (compTypeField === 'br') {
          if (typeof zlib.createBrotliCompress === 'function') {
            compressor = zlib.createBrotliCompress();
          } else {
            res.writeHead(400);
            res.end('Brotli compression not supported');

            return;
          }
          ext = '.br';
        } else {
          res.writeHead(400);
          res.end('Unsupported compression type');

          return;
        }

        const fileStream = Readable.from(fileField.content);

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${fileField.filename + ext}`,
        });

        fileStream.pipe(compressor).pipe(res);
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

module.exports = {
  createServer,
};
