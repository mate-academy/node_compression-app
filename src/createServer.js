'use strict';

const http = require('http');
const zlib = require('zlib');
const path = require('path');
const fs = require('fs');

const COMPRESSION_MAP = {
  gzip: { fn: () => zlib.createGzip(), ext: '.gz' },
  deflate: { fn: () => zlib.createDeflate(), ext: '.dfl' },
  br: { fn: () => zlib.createBrotliCompress(), ext: '.br' },
};

/**
 * Parse a multipart/form-data body.
 * Returns { fields: { name: value },
 * files: { name: { filename, data: Buffer } } }
 */
function parseMultipart(buffer, boundary) {
  const fields = {};
  const files = {};

  const boundaryBuf = Buffer.from('--' + boundary);
  // const CRLF = Buffer.from('\r\n');
  const CRLFCRLF = Buffer.from('\r\n\r\n');

  let offset = 0;

  while (offset < buffer.length) {
    // Find next boundary
    const boundaryIdx = indexOf(buffer, boundaryBuf, offset);

    if (boundaryIdx === -1) {
      break;
    }

    offset = boundaryIdx + boundaryBuf.length;

    // Check for final boundary (--)
    if (buffer[offset] === 0x2d && buffer[offset + 1] === 0x2d) {
      break;
    }

    // Skip CRLF after boundary
    if (buffer[offset] === 0x0d && buffer[offset + 1] === 0x0a) {
      offset += 2;
    }

    // Find header/body separator
    const headerEnd = indexOf(buffer, CRLFCRLF, offset);

    if (headerEnd === -1) {
      break;
    }

    const headerStr = buffer.slice(offset, headerEnd).toString('utf8');

    offset = headerEnd + 4; // skip \r\n\r\n

    // Find end of this part (next boundary)
    const nextBoundary = indexOf(buffer, boundaryBuf, offset);

    if (nextBoundary === -1) {
      break;
    }

    // eslint-disable-next-line max-len
    // Part body ends 2 bytes before the next boundary
    // line (strip trailing \r\n)
    const bodyEnd = nextBoundary - 2;
    const body = buffer.slice(offset, bodyEnd);

    // Parse Content-Disposition
    const dispMatch = headerStr.match(
      /Content-Disposition:[^\r\n]*[^a-z]name="([^"]+)"/i,
    );

    if (!dispMatch) {
      offset = nextBoundary;
      continue;
    }

    const name = dispMatch[1];

    const fileMatch = headerStr.match(/filename="([^"]*)"/i);

    if (fileMatch) {
      files[name] = { filename: fileMatch[1], data: body };
    } else {
      fields[name] = body.toString('utf8');
    }

    offset = nextBoundary;
  }

  return { fields, files };
}

/** indexOf for Buffers */
function indexOf(haystack, needle, start = 0) {
  for (let i = start; i <= haystack.length - needle.length; i++) {
    let found = true;

    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        found = false;
        break;
      }
    }

    if (found) {
      return i;
    }
  }

  return -1;
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Serve the HTML page
    if (req.method === 'GET' && pathname === '/') {
      const htmlPath = path.join(__dirname, 'index.html');
      const stream = fs.createReadStream(htmlPath);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      stream.pipe(res);

      return;
    }

    // Handle GET /compress → 400
    if (req.method === 'GET' && pathname === '/compress') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request: GET is not allowed on /compress. Use POST.');

      return;
    }

    // Handle POST /compress
    if (req.method === 'POST' && pathname === '/compress') {
      const contentType = req.headers['content-type'] || '';
      const boundaryMatch = contentType.match(/boundary=(.+)$/i);

      if (!contentType.startsWith('multipart/form-data') || !boundaryMatch) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request: Expected multipart/form-data.');

        return;
      }

      const boundary = boundaryMatch[1];
      const chunks = [];

      req.on('data', (chunk) => chunks.push(chunk));

      req.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let parsed;

        try {
          parsed = parseMultipart(buffer, boundary);
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad Request: Failed to parse form data.');

          return;
        }

        const { fields, files } = parsed;
        const compressionType = fields['compressionType'];
        const uploadedFile = files['file'];

        // Validate: file present
        if (!uploadedFile || !uploadedFile.filename) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad Request: No file provided.');

          return;
        }

        // Validate: compression type supported
        if (!compressionType || !COMPRESSION_MAP[compressionType]) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });

          res.end(
            `Bad Request: Unsupported compression type "${compressionType}". Use gzip, deflate, or br.`,
          );

          return;
        }

        const { fn: createCompressor, ext } = COMPRESSION_MAP[compressionType];
        const outputFilename = uploadedFile.filename + ext;

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${outputFilename}`,
        });

        // Stream: Buffer → compressor → response
        const { Readable } = require('stream');
        const readable = Readable.from(uploadedFile.data);
        const compressor = createCompressor();

        readable.pipe(compressor).pipe(res);

        compressor.on('error', () => {
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
          }
        });
      });

      req.on('error', () => {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request: Error reading request body.');
      });

      return;
    }

    // 404 for everything else
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });
}

module.exports = {
  createServer,
};
