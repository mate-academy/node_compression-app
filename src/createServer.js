'use strict';

const http = require('http');
const zlib = require('zlib');
const { Readable } = require('stream');

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    if (path === '/') {
      if (req.method !== 'GET') {
        res.statusCode = 404;
        res.end('Not found');

        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });

      res.end(`
        <!DOCTYPE html>
        <html lang="en">
        <head><title>Compression App</title></head>
        <body>
          <form action="/compress" method="POST" enctype="multipart/form-data">
            <input type="file" name="file" required />
            <select name="compressionType" required>
              <option value="gzip">gzip</option>
              <option value="deflate">deflate</option>
              <option value="br">br</option>
            </select>
            <button type="submit">Submit</button>
          </form>
        </body>
        </html>
      `);

      return;
    }

    if (path === '/compress') {
      if (req.method === 'GET') {
        res.statusCode = 400;
        res.end('Bad Request');

        return;
      }

      if (req.method === 'POST') {
        const contentType = req.headers['content-type'] || '';

        if (!contentType.includes('multipart/form-data')) {
          res.statusCode = 400;
          res.end('Invalid form');

          return;
        }

        const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
        const boundary = match ? match[1] || match[2] : null;

        if (!boundary) {
          res.statusCode = 400;
          res.end('Invalid form');

          return;
        }

        const bodyChunks = [];

        req.on('data', (chunk) => bodyChunks.push(chunk));

        req.on('end', () => {
          const buffer = Buffer.concat(bodyChunks);
          const boundaryBuffer = Buffer.from('--' + boundary);

          const parts = [];
          let start = buffer.indexOf(boundaryBuffer);

          while (start !== -1) {
            start += boundaryBuffer.length;

            const next = buffer.indexOf(boundaryBuffer, start);

            if (next === -1) {
              break;
            }
            parts.push(buffer.slice(start, next));
            start = next;
          }

          let fileData = null;
          let fileName = null;
          let compressionType = null;

          for (const part of parts) {
            let offset = 0;

            if (part[0] === 13 && part[1] === 10) {
              offset = 2;
            } // пропускаємо \r\n

            const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'), offset);

            if (headerEnd !== -1) {
              const headers = part.slice(offset, headerEnd).toString();
              let content = part.slice(headerEnd + 4);

              if (
                content.length >= 2 &&
                content[content.length - 2] === 13 &&
                content[content.length - 1] === 10
              ) {
                content = content.slice(0, content.length - 2);
              }

              if (headers.includes('name="file"')) {
                const nameMatch = headers.match(/filename="([^"]+)"/);

                if (nameMatch) {
                  fileName = nameMatch[1];
                  fileData = content;
                }
              } else if (headers.includes('name="compressionType"')) {
                compressionType = content.toString().trim();
              }
            }
          }

          if (!fileData || !fileName || !compressionType) {
            res.statusCode = 400;
            res.end('Invalid form');

            return;
          }

          let compressor;
          let ext;

          if (compressionType === 'gzip') {
            compressor = zlib.createGzip();
            ext = '.gz';
          } else if (compressionType === 'deflate') {
            compressor = zlib.createDeflate();
            ext = '.dfl';
          } else if (compressionType === 'br') {
            compressor = zlib.createBrotliCompress();
            ext = '.br';
          } else {
            res.statusCode = 400;
            res.end('Unsupported compression');

            return;
          }

          res.writeHead(200, {
            'Content-Disposition': `attachment; filename=${fileName}${ext}`,
            'Content-Type': 'application/octet-stream',
          });

          Readable.from(fileData).pipe(compressor).pipe(res);
        });

        req.on('error', () => {
          res.statusCode = 400;
          res.end('Error reading request');
        });

        return;
      }
    }

    res.statusCode = 404;
    res.end('Not Found');
  });
}

module.exports = {
  createServer,
};
