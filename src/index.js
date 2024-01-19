/* eslint-disable no-console */
// /* eslint-disable no-console */
'use strict';

import http from 'node:http';
import formidable, {errors as formidableErrors} from 'formidable';
import fs from 'fs';
import path from 'node:path';
import zlib from 'zlib';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  // const fileName = url.pathname.slice(1) || 'index.html';
  // const filePath = path.resolve('public', fileName);

  if (req.url === '/download' && req.method.toLowerCase() === 'post') {
    // parse a file upload
    const form = formidable({});
    let fields;
    let files;
    try {
      [fields, files] = await form.parse(req);
    } catch (err) {
      // example to check for a very specific error
      if (err.code === formidableErrors.maxFieldsExceeded) {

      }
      console.error(err);
      res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
      res.end(String(err));
      return;
    }
    // res.writeHead(200, { 'Content-Type': 'application/json' });
    const type = fields.archiveType[0];

    res.setHeader('Content-Encoding', type);
    console.log(fields.archiveType[0]);

    const fileStream = fs.createReadStream(fields.file[0]);
    console.log (fields.file[0]);

    const file = type === 'br' ? zlib.createBrotliCompress()  : zlib.createGzip();


    fileStream.pipe(file).pipe(res);
    const fileName = fields.file[0] + '.' + type;
    res.setHeader('Content-Type', 'application/octet-stream');

    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    res.statusCode = 200;
  }

  // show a file upload form
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <h1>Create file</h1>

    <form action="/download" method="POST">
    <label for="file"><p>Choose file:</p></label>
    <input type="file" name="file" id="file" required>

    <label for="archiveType"><p> Choose type of file:</p></label>
    <select name="archiveType" id="archiveType">
      <option value="br">Brotli (.br)</option>
      <option value="gzip">Gzip (.gz)</option>
    </select>
    <button type="submit"><strong>Submit</strong></button>
    </form>
  `);
});

server.listen(8080, () => {
  console.log('Server listening on http://localhost:8080/ ...');
});

