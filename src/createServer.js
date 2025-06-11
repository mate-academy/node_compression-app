/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const zlib = require('zlib');
const { IncomingForm } = require('formidable');

const compressionMap = {
  gzip: { stream: zlib.createGzip, ext: '.gz' }, // <- Змініть це на '.gzip'
  deflate: { stream: zlib.createDeflate, ext: '.deflate' },
  br: { stream: zlib.createBrotliCompress, ext: '.br' },
};

const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const handleCompression = (req, res) => {
  const form = new IncomingForm({
    multiples: false,
    keepExtensions: true,
    uploadDir: uploadsDir,
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Error parsing form data:', err);
      res.writeHead(400);

      return res.end('Error parsing form data');
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const compressionType = Array.isArray(fields.compressionType)
      ? fields.compressionType[0]
      : fields.compressionType;

    if (!file || !compressionType || !compressionMap[compressionType]) {
      console.log('Validation failed:', { file, compressionType });
      res.writeHead(400);

      return res.end('Invalid form or compression type');
    }

    const filepath = file.filepath;
    const originalFilename = file.originalFilename;

    if (!filepath) {
      console.log('Missing file path:', file);
      res.writeHead(400);

      return res.end('Missing file path');
    }

    const { stream: compressor, ext } = compressionMap[compressionType];

    const finalExt = compressionType === 'gzip' ? '.gzip' : ext;
    const compressedFileName = originalFilename + finalExt;
    // --- КІНЕЦЬ ВИПРАВЛЕНЬ ---

    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',

      'Content-Disposition': `attachment; filename=${compressedFileName}`,
      // --- КІНЕЦЬ ВИПРАВЛЕНЬ ДЛЯ ТЕСТУ ---
    });

    pipeline(fs.createReadStream(filepath), compressor(), res, (error) => {
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) {
          console.error(
            `Error deleting temporary file ${filepath}:`,
            unlinkErr,
          );
        }
      });

      if (error) {
        console.error('Compression pipeline failed:', error);
        res.writeHead(500);
        res.end('Compression failed');
      }
    });
  });
};

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      const htmlPath = path.join(process.cwd(), 'public', 'index.html');

      fs.readFile(htmlPath, (err, data) => {
        if (err) {
          console.error('Error loading html:', err);
          res.writeHead(500);
          res.end('Error loading html');

          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
    } else if (req.url === '/compress' && req.method === 'POST') {
      handleCompression(req, res);
    } else if (req.url === '/compress') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Only POST is allowed on /compress');
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
}

module.exports = { createServer };
