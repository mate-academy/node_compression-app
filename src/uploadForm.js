'use strict';

const uploadForm = `
  <form
    action="http://localhost:3000/fileupload"
    method="POST"
    enctype="multipart/form-data"
    style="
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      text-align: center;
      margin-top: 12rem;
      color: black;
      font-family: sans-serif;
      font-size: 1.5rem;
      "
  >
    <input
      type="file"
      name="fileupload"
      style="max-width: 200px;"
    >
    </input>

    <select name="select">
      <option value="Gzip">Gzip</option>
      <option value="Brotli">Brotli</option>
    </select>

    <input
      type="submit"
      style="max-width: 150px;"
    >
    </input>
  </form>
`;

module.exports = {
  uploadForm,
};
