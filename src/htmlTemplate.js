'use strict';

const htmlTemplate = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Compression App</title>
    </head>
    <body>
      <h2>Choose the type of compression:</h2>
      <form action="/api/upload" enctype="multipart/form-data" method="post">
        <select name="compressionType">
          <option value="gzip">Gzip</option>
          <option value="deflate">Deflate</option>
          <option value="br">Brotli</option>
        </select>
        <div>File to compress: <input type="file" name="file" /></div>
        <input type="submit" value="Upload" />
      </form>
    </body>
  </html>
`;

module.exports = { htmlTemplate };
