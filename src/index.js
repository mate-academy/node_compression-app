'use strict';

const http = require('http');
const zlib = require('zlib');

const { createReadStream } = require('fs');
const { pipeline } = require('stream');

const formidable = require('formidable');

const { htmlTemplate } = require('./htmlTemplate');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/api/upload' && req.method.toLowerCase() === 'post') {
    const form = formidable({ multiples: true });

    form.parse(req, (error, fields, files) => {
      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(String(error));

        return;
      }

      const uploadedFile = Array.isArray(files.file)
        ? files.file[0]
        : files.file;

      if (!uploadedFile || !uploadedFile.size) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('File not found');

        return;
      }

      const { compressionType } = fields;

      let compressStream;
      let fileExtension;

      switch (compressionType) {
        case 'deflate':
          compressStream = zlib.createDeflate();
          fileExtension = 'zz';
          break;
        case 'br':
          compressStream = zlib.createBrotliCompress();
          fileExtension = 'br';
          break;
        case 'gzip':
        default:
          compressStream = zlib.createGzip();
          fileExtension = 'gz';
          break;
      }

      const fileReadStream = createReadStream(uploadedFile.filepath);

      res.on('close', () => {
        fileReadStream.destroy();
      });

      res.writeHead(200, { 'Content-Disposition': `inline; filename="compressed_file.${fileExtension}"` });

      pipeline(fileReadStream, compressStream, res, (pipelineError) => {
        if (pipelineError) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end(String(pipelineError));
        }
      });
    });

    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(htmlTemplate);
});

server.on('error', (error) => {
  // eslint-disable-next-line no-console
  console.error(error);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});
