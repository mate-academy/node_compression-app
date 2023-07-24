/* eslint-disable no-console */

'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const { formidable, errors: formidableErrors } = require('formidable');
const { pipeline } = require('stream');

const PORT = 3030;

const server = http.createServer(async(req, res) => {
  if (req.method === 'POST' && req.url === '/api/upload') {
    const form = formidable();
    let fields;
    let files;

    try {
      [fields, files] = await form.parse(req);
    } catch (err) {
      if (err.code === formidableErrors.maxFieldsExceeded) {
        console.error(err);

        res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
        res.end(String(err));

        return;
      }
    }

    const chosenType = fields.typeOfCompressing[0];

    const file = files.file[0];
    const filename = file.originalFilename + '-compressed';
    const fileStream = fs.createReadStream(file.filepath);

    let compressMethod;
    let encoding;

    switch (chosenType) {
      case 'brotliCompress':
        compressMethod = zlib.createBrotliCompress();
        encoding = 'br';

        break;

      case 'deflate':
        compressMethod = zlib.createDeflate();
        encoding = 'deflate';

        break;

      default:
        compressMethod = zlib.createGzip();
        encoding = 'gzip';

        break;
    }

    res.setHeader('Content-Encoding', encoding);

    res.setHeader('Content-Disposition',
      `attachment: filename=${filename}`);

    pipeline(fileStream, compressMethod, res, (err) => {
      if (err) {
        console.error(err);

        res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
        res.end(String(err));
      }
    });

    res.end();
  }
});

server.listen(PORT, () => {
  console.log('Server is running on' + ' http://localhost:' + PORT);
});
