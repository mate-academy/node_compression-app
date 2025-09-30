'use strict';

const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const formidable = require('formidable');

// Lorem2 ipsum dolor sit amet, consectetur adipiscing elit.
function createServer() {
  return http.createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Welcome to the File Upload Server</h1>');

      return;
    }

    if (req.url !== '/compress') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');

      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request: POST method required');

      return;
    }

    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {


        return;
      }

      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      const allowedTypes = ['gzip', 'deflate', 'br'];
      const compressionType = Array.isArray(fields.compressionType)
        ? fields.compressionType[0]
        : fields.compressionType;

      if (!file || !file.filepath || !compressionType) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request: No file uploaded');

        return;
      }

      if (!allowedTypes.includes(compressionType)) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request: Unsupported compression type');

        return;
      }

      let compressor;
      let extension;
      let contentTypeName;

      switch (compressionType) {
        case 'gzip':
          compressor = zlib.createGzip();
          extension = '.gz'; // коротке розширення
          contentTypeName = 'gzip'; // для заголовка
          break;
        case 'deflate':
          compressor = zlib.createDeflate();
          extension = '.dfl';
          contentTypeName = 'deflate';
          break;
        case 'br':
          compressor = zlib.createBrotliCompress();
          // eslint-disable-next-line no-unused-vars
          extension = '.br';
          contentTypeName = 'br';
          break;
        default:
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad Request: Unsupported compression type');

          return;
      }

      const originalFileName = file.originalFilename || 'uploaded_file';
      // const compressedFileName = `${originalFileName}${extension}`;

      // Передаємо у Content-Disposition повне ім’я алгоритму

      });

      const inputStream = fs.createReadStream(file.filepath);

      inputStream.pipe(compressor).pipe(res);
    });
  });
}

module.exports = {
  createServer,
};
