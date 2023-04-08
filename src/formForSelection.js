'use strict';

const formForSelection = `
  <form action="/compress" enctype="multipart/form-data" method="POST">
    <input type="file" name="file">

    <select name="compression">
      <option value="gzip">Gzip</option>
      <option value="br">Brotli</option>
      <option value="dfl">Deflate</option>
    </select>

    <button type="submit">Compress</button>
  </form>
`;

module.exports = { formForSelection };
