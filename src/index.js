/* eslint-disable no-console */
// /* eslint-disable no-console */
'use strict';

import http from 'node:http';
import formidable, {errors as formidableErrors} from 'formidable';
import fs from 'fs';
import zlib from 'zlib';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.url === '/download' && req.method.toLowerCase() === 'post') {
    const form = formidable({});
    let formFields;
    let files;
    try {
      [formFields, files] = await form.parse(req);
    } catch (err) {
      console.error(err);
      res.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
      res.end(String(err));
      return;
    }

    const type = formFields.archiveType[0];

    res.setHeader('Content-Encoding', type);
    const fileStream = fs.createReadStream(formFields.file[0]);
    const file = type === 'br' ? zlib.createBrotliCompress()  : zlib.createGzip();


    fileStream.pipe(file).pipe(res);
    const fileName = formFields.file[0] + '.' + type;
    res.setHeader('Content-Type', 'application/octet-stream');

    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    res.statusCode = 200;
  }

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

