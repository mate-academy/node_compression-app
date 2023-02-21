'use strict';

const compressFilesForm = `
  <html>
    <body>
      <form action="/compress" method="POST" enctype="multipart/form-data">
        <input type="file" name="file">
        <select name="compressionType">
          <option value="gzip">Gzip</option>
          <option value="brotli">Brotli</option>
          <option value="deflate">Deflate</option>
        </select>
        <button type="submit">Compress</button>
      </form>
    </body>
  </html>
`;

module.exports = {
  compressFilesForm,
};
