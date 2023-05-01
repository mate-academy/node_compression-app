'use strict';

const form = `
  <form action="/compression" enctype="multipart/form-data" method="POST">
    <input type="file" name="file">
    <select name="compression">
      <option value="gzip">Gzip</option>
      <option value="br">Brotli</option>
      <option value="dfl">Deflate</option>
    </select>
    <button type="submit">Compress</button>
  </form>
`;

module.exports = { form };
