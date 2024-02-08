'use strict';

const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const { pipeline } = require('stream');
const formidable = require('formidable');

function createServer() {
  const server = http.createServer(async(req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/') {
      res.setHeader('Content-Type', 'text/html');

      const readStream = fs.createReadStream('./public/index.html');

      readStream.on('error', () => {
        res.statusCode = 500;
        res.end('Server error');
      });

      res.on('close', () => readStream.destroy());

      readStream.pipe(res);

      return;
    }

    if (url.pathname !== '/compress') {
      res.setHeader('Content-Type', 'text/plain');
      res.statusCode = 404;
      res.end('Trying to reach a non-existent endpoint');

      return;
    }

    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/plain');
      res.statusCode = 400;
      res.end('Invalid request method for "/compress" endpoint');

      return;
    }

    if (req.method === 'POST') {
      const form = new formidable.IncomingForm({
        allowEmptyFiles: true,
        minFileSize: 0,
        uploadDir: `${__dirname}/../uploads`,
      });

      let fields;
      let files;

      form.on('fileBegin', function(name, file) {
        file.filepath = form.uploadDir + '/' + file.originalFilename;
      });

      try {
        [fields, files] = await form.parse(req);
      } catch (error) {
        res.setHeader('Content-Type', 'text/plain');
        res.statusCode = 500;
        res.end('Server error');

        return;
      }

      if (!files.file || !files.file[0].size
        || !fields.compressionType || !fields.compressionType[0]) {
        res.setHeader('Content-Type', 'text/plain');
        res.statusCode = 400;
        res.end('Form is invalid');

        return;
      }

      const compressionType = fields.compressionType[0];
      const filePath = files.file[0].filepath;
      const fileName = files.file[0].originalFilename;

      if (!['gzip', 'deflate', 'br'].includes(compressionType)) {
        res.setHeader('Content-Type', 'text/plain');
        res.statusCode = 400;
        res.end('Invalid compression type');

        return;
      }

      const compressedFileExtension = compressionType === 'gzip'
        ? '.gz'
        : compressionType === 'deflate'
          ? '.dfl'
          : '.br';

      res.setHeader('Content-Encoding', compressionType);

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${fileName + compressedFileExtension}`
      );

      const fileStream = fs.createReadStream(filePath);
      const compressionStream = compressionType === 'gzip'
        ? zlib.createGzip()
        : compressionType === 'deflate'
          ? zlib.createDeflate()
          : zlib.createBrotliCompress();

      pipeline(fileStream, compressionStream, res, () => {
        res.setHeader('Content-Type', 'text/plain');
        res.statusCode = 500;
        res.end('Server error');
      });

      res.on('close', () => {
        fileStream.destroy();

        fs.rmSync(filePath);
      });
    }
  });

  return server;
}

module.exports = {
  createServer,
};
