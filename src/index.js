'use strict';

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const formidable = require('formidable');
const server = new http.Server();

server.on('request', async(req, res) => {
  if (req.url === '/upload') {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    res.setHeader('Content-Disposition', 'attachment; filename="text.txt"');

    let compressionStream;

    switch (fields.select[0]) {
      case 'gzip':
        compressionStream = zlib.createGzip();
        res.setHeader('Content-Encoding', 'gzip');
        break;
      case 'deflate':
        compressionStream = zlib.createDeflate();
        res.setHeader('Content-Encoding', 'deflate');
        break;
    }

    const fileStream = fs.createReadStream(files.file[0].filepath);

    fileStream
      // eslint-disable-next-line
      .on('error', (error) => console.log('fileStream ERROR', error))
      .pipe(compressionStream)
      // eslint-disable-next-line
      .on('error', (error) => console.log('compressionStream ERROR', error))
      .pipe(res)
      // eslint-disable-next-line
      .on('error', (error) => console.log('res ERROR', error));
  }

  if (req.url === '/') {
    fs.readFile('src/download.html', (error, data) => {
      if (error) {
        res.end('something went wrong, try letter');
      } else {
        res.setHeader('Content-type', 'text/html');
        res.end(data);
      }
    });
  }
});

server.on('error', (error) => {
  // eslint-disable-next-line
  console.log('server error', error);
});

server.listen(3000, () => {
  // eslint-disable-next-line
  console.log('server running...');
});
