'use strict';

const http = require('http');
const { compressionFile } = require('./copmressionFile');
const fs = require('fs');
const formidable = require('formidable');
const { pipeline } = require('stream');
const { form } = require('./form');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/compression') {
    const formData = new formidable.IncomingForm();

    formData.parse(req, function(err, fields, files) {
      if (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      const file = fs.createReadStream(files.file.filepath);

      const fileName = files.file.originalFilename + `.${fields.compression}`;

      const writeFile = fs.createWriteStream(fileName);

      pipeline(
        file,
        compressionFile(fields.compression),
        writeFile,
        (error) => {
          if (error) {
          // eslint-disable-next-line no-console
            console.error(error);
          }
          res.setHeader('Content-Type', 'application/octet-stream');

          res.setHeader(
            'Content-Disposition', `attachment; filename="${fileName}"`
          );

          const readCompressionFile = fs.createReadStream(fileName);

          readCompressionFile.pipe(res);
        });
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(form);
    res.end();
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`server start on port: ${PORT}`);
});
