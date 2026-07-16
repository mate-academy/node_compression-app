'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { formidable } = require('formidable');
const zlib = require('zlib');
const { pipeline } = require('node:stream');

const compressionTypes = { gzip: 'gz', deflate: 'dfl', br: 'br' };

function getCompressionMimeType(type) {
  switch (type) {
    case 'gzip':
      return 'application/gzip';
    case 'br':
      return 'application/brotli';
    case 'deflate':
      return 'application/zlib';
    default:
      return 'application/octet-stream';
  }
}

function getIndexContent(message = '') {
  const indexFile = 'public/index.html';
  const indexPath = path.join(__dirname, '../', indexFile);
  const fileContent = fs.readFileSync(indexPath).toString();

  return fileContent.replace(/{{\s*message\s*}}/, message);
}

/**
 * Express/Node.js route handler to compress an uploaded file on-the-fly
 * and stream it back to the client as a download attachment.
 *
 * @param {import('node:http').IncomingMessage} req - HTTP request stream.
 * @param {import('node:http').ServerResponse} res - HTTP response stream.
 * @returns {void}
 */
function downloadFile(req, res, uploadedFile, compressionType) {
  const fileExtension = compressionTypes[compressionType];

  if (!fileExtension) {
    return res
      .writeHeader(400, {
        'Content-Type': 'text/plan; charset=utf-8',
      })
      .end(
        `Trying to compress a file with an unsupported compression type (${compressionType})`,
      );
  }

  const fileName = uploadedFile.originalFilename;
  const filePath = uploadedFile.filepath;
  const fileStream = fs.createReadStream(filePath);
  const compressStream = getCompressStream(compressionType);
  const mimeType = getCompressionMimeType(compressionType);

  res.writeHead(200, {
    'Content-Type': mimeType,
    'Content-Disposition': `attachment; filename=${fileName}.${fileExtension}`,
  });

  pipeline(fileStream, compressStream, res, () => {
    res.statusCode = 500;
    res.end('Server Error');
  });

  res.on('close', () => {
    fileStream.destroy();
  });
}

/**
 * Creates and returns the appropriate compression stream based on the type.
 * @param {'gz' | 'dfl' | 'br'} compressionType
 *   - The compression format as a string.
 * @returns {import('node:zlib').Gzip
 *  | import('node:zlib').Deflate | import('node:zlib').BrotliCompress}
 *   - The compression stream.
 */
function getCompressStream(compressionType) {
  switch (compressionType) {
    case 'gzip':
      return zlib.createGzip();
    case 'deflate':
      return zlib.createDeflate();
    case 'br':
      return zlib.createBrotliCompress();
    default:
      // Fallback safely or throw a clear error
      throw new Error(`Unsupported compression type: ${compressionType}`);
  }
}

function createServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const requestedPath = url.pathname.slice(1) || 'index.html';
    const route = `${req.method} ${requestedPath}`;

    switch (route) {
      case 'GET index.html':
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getIndexContent(url));

        return;

      case 'GET compress':
        res
          .writeHead(400, { 'Content-Type': 'text/plan; charset=utf-8' })
          .end(`Bad http method for "/compress" `);

        return;

      case 'POST compress':
        const form = formidable({});

        form.parse(req, (err, fields, files) => {
          if (err) {
            return res
              .writeHeader(400, {
                'Content-Type': 'text/plan; charset=utf-8',
              })
              .end('Invalid form');
          }

          const compressionType =
            (fields.compressionType && fields.compressionType[0]) || '';

          if (!files.file?.length) {
            return res
              .writeHeader(400, {
                'Content-Type': 'text/plan; charset=utf-8',
              })
              .end('Invalid form');
          }

          const uploadedFile = files.file[0];

          try {
            downloadFile(req, res, uploadedFile, compressionType);
          } catch (error) {
            return res
              .writeHead(500)
              .end('Server error!\n' + JSON.stringify(error));
          }
        });

        return;

      default:
        res.writeHead(404, { 'Content-Type': 'text/plan; charset=utf-8' });
        res.end(`The path "${requestedPath}" does not exist`);
    }
  });

  return server;
}

module.exports = {
  createServer,
};
