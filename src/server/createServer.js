/* eslint-disable max-len */
/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const multiparty = require('multiparty');

const { getCorrectCompressType } = require('./getCorrectCompressType');

const createServer = (PORT = process.env.PORT || 8080) => {
  const server = http.createServer((req, res) => {
    const form = new multiparty.Form();

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Error parsing form:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');

        return;
      }

      if (req.url === '/send' && req.method === 'POST') {
        const compressType = fields.compressType[0];
        const file = files.file[0];

        const compressor = getCorrectCompressType(compressType);
        const fileStream = fs.createReadStream(file.path);

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=${file.originalFilename}.${compressType}`,
        });

        fileStream.pipe(compressor).pipe(res);
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

module.exports = { createServer };
