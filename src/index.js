'use strict';

import http from 'http'
import fs from 'fs'
import zlib from 'zlib'
import formidable from 'formidable';

const server = new http.Server();

server.on('request', async (req, res) => {
  if (req.url === '/upload') {
    const form = formidable({});
    let [fields, files] = await form.parse(req);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="text.txt"');

    let compressionStream
    switch (fields.compressionType[0]) {
      case 'gzip':
        compressionStream = zlib.createGzip();
        res.setHeader('Content-Encoding', 'gzip');
        break;
      case 'deflate':
        compressionStream = zlib.createDeflate()
        res.setHeader('Content-Encoding', 'deflate');
        break;
    }

    console.log('files.file[0].filepath', files.file[0].filepath);
    console.log('compressionStream', compressionStream);
    const fileStream = fs.createReadStream(files.file[0].filepath);

    fileStream.pipe(compressionStream).pipe(res);
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
  console.log('error', error)
})

server.listen(3000, () => {
  console.log('server running...');
});
