'use strict';

const endpoints = {
  home: '/',
  compress: '/compress',
};

const compMethods = {
  gzip: 'gz',
  deflate: 'dfl',
  brotli: 'br',
};

const htmlNames = {
  comp: 'compressionType',
  file: 'file',
};

const selectNames = {
  [compMethods.gzip]: 'gzip',
  [compMethods.deflate]: 'deflate',
  [compMethods.brotli]: 'br',
};

const index = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compression app</title>
</head>
<body>

    <form 
      action="${endpoints.compress}?${htmlNames.comp}=${compMethods.gzip}" 
      method="post"
      enctype="multipart/form-data"
    > 

    <label>
      Compression: 
      <select name="${htmlNames.comp}" required onChange="updateAction(this.value)">
        <option value="${compMethods.gzip}" selected>${selectNames[compMethods.gzip]}</option>
        <option value="${compMethods.deflate}">${selectNames[compMethods.deflate]}</option>
        <option value="${compMethods.brotli}">${selectNames[compMethods.brotli]}</option>
      </select> 
    </label>

        <label>
            File: 
            <input type="file" name="${htmlNames.file}" required>
        </label>
        
        <button type="submit">Compress</button>
    </form>

    <script>
      function updateAction(type) {
        document.querySelector('form').action =
        '${endpoints.compress}?${htmlNames.comp}=' + type;
      }
    </script>
</body>
</html>
`;

module.exports = {
  endpoints,
  compMethods,
  htmlNames,
  index,
};
