'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream');

function createServer() {
  const server = new http.Server();

  server.on('request', async (req, res) => {
    if (req.method === 'GET') {
      if (req.url === '/' || req.url === '/index.html') {
        const filePath = path.join(__dirname, 'index.html');
        const stream = fs.createReadStream(filePath);

        res.on('close', () => {
          stream.destroy();
        });
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');

        stream.on('error', () => {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Internal Server Error');
        });
        stream.pipe(res);

        return;
      } else if (req.url === '/compress') {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain');
        res.end('GET method not allowed for /compress');

        return;
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Not Found');

        return;
      }
    }

    if (req.method === 'POST') {
      if (req.url === '/compress') {
        const formContent = [];

        for await (const chunk of req) {
          formContent.push(chunk);
        }

        const bodyBuffer = Buffer.concat(formContent);
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=([^;]+)/i);

        let input;
        let compressionType;

        if (boundaryMatch) {
          const boundary = `--${boundaryMatch[1]}`;
          const bodyStr = bodyBuffer.toString('binary');

          const parts = bodyStr
            .split(boundary)
            .map((s) => s.trimStart())
            .filter((s) => s && s !== '--');

          let originalFilename;
          let fileBuffer;

          for (const part of parts) {
            const headerEndIdx = part.indexOf('\r\n\r\n');

            if (headerEndIdx === -1) {
              continue;
            }

            const headersStr = part.slice(0, headerEndIdx);
            let contentStr = part.slice(headerEndIdx + 4);

            if (contentStr.endsWith('\r\n')) {
              contentStr = contentStr.slice(0, -2);
            }

            const cdLine =
              headersStr
                .split('\r\n')
                .find((h) => /^content-disposition:/i.test(h)) || '';
            const nameMatch = cdLine.match(/name="?([^";]+)"?/i);
            const filenameMatch = cdLine.match(/filename="?([^";]+)"?/i);

            const partName = nameMatch ? nameMatch[1] : undefined;

            if (filenameMatch) {
              originalFilename = filenameMatch[1];
              fileBuffer = Buffer.from(contentStr, 'binary');
            } else if (partName === 'compressionType') {
              compressionType = contentStr.trim();
            }
          }

          if (originalFilename && fileBuffer) {
            const savePath = path.join(__dirname, originalFilename);

            try {
              fs.writeFileSync(savePath, fileBuffer);
              input = originalFilename;
            } catch (e) {}
          }
        } else {
          const body = bodyBuffer.toString();
          const params = new URLSearchParams(body);

          input = params.get('input');
          compressionType = params.get('compressionType');
        }

        if (
          !input ||
          !compressionType ||
          !['gzip', 'deflate', 'br'].includes(compressionType)
        ) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Invalid form data');

          return;
        }

        const filePath = path.join(__dirname, input);
        const fileStream = fs.createReadStream(filePath);
        let zip;

        switch (compressionType) {
          case 'gzip':
            zip = zlib.createGzip();
            break;
          case 'deflate':
            zip = zlib.createDeflate();
            break;
          case 'br':
            zip = zlib.createBrotliCompress();
            break;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/octet-stream');

        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${path.basename(filePath)}.${compressionType}`,
        );

        pipeline(fileStream, zip, res, (err) => {
          if (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'text/plain');
            res.end('Compression error');
          }
        });

        return;
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Not Found');

        return;
      }
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not Found');
  });

  server.on('error', () => {});

  return server;
}

module.exports = {
  createServer,
};
