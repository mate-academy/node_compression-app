'use strict';

const http = require('http');
const fs = require('fs');
const formidable = require('formidable');
const zlib = require('zlib');
const { pipeline } = require('stream');
const path = require('path');

const PORT = process.env.PORT || 3000;

const processError = (res, httpCode, message) => {
  res.writeHead(httpCode, { 'Content-Type': 'text/plain' });
  res.end(message);

  return res;
};

const handleErrors = (res, err, fields, files) => {
  if (err) {
    return processError(
      res,
      err.httpCode || 400,
      'Error while parsing form data',
    );
  }

  if (!fields.compressionType) {
    return processError(
      res,
      400,
      'Compression type is not defined',
    );
  }

  if (!files.file) {
    return processError(res, 400, 'File not found');
  }

  const filePath = files.file.filepath;

  if (!fs.existsSync(filePath)) {
    return processError(
      res,
      500,
      'Internal error: Can not access original file',
    );
  }
};

const getCompressData = (type) => {
  switch (type) {
    case 'gzip':
      return {
        compressFn: zlib.createGzip(),
        extension: 'gz',
      };

    case 'br':
      return {
        compressFn: zlib.createBrotliCompress(),
        extension: 'br',
      };

    default:
      return null;
  }
};

const compress = (res, fields, files) => {
  const onError = () => processError(
    res,
    500,
    'Internal error: Unable to compress'
  );

  const filePath = files.file.filepath;

  const fileToProcess = fs.createReadStream(filePath);
  const compressedFileName = files.file.originalFilename
    + `_${fields.compressionType}_compressed`;

  const compressData = getCompressData(fields.compressionType);

  if (!compressData) {
    return onError();
  }

  const { compressFn, extension } = compressData;

  res.writeHead(200, {
    'Content-Disposition':
      `attachment; filename=${compressedFileName}.${extension}`,
  });
  pipeline(fileToProcess, compressFn, res, onError);
};

const processFormData = (req, res) => {
  const form = formidable({});

  return form.parse(req, (err, fields, files) => {
    handleErrors(res, err, fields, files);
    compress(res, fields, files);
  });
};

const server = new http.Server();

server.on('request', (req, res) => {
  const pathName = new URL(req.url, `http://${req.headers.host}`)
    .pathname
    .slice(1);

  const normPathName = pathName || 'index.html';

  if (normPathName !== 'upload') {
    fs.readFile(
      path.join(__dirname, '..', 'static', normPathName),
      (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end();
        } else {
          res.end(data);
        }
      });

    return;
  }

  if (req.method.toLowerCase() !== 'post') {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Server accepts only POST requests');

    return;
  }

  return processFormData(req, res);
});

server.on('error', (error) => {
  // eslint-disable-next-line no-console
  console.log(error);
});

server.listen(PORT, (error) => {
  if (!error) {
    // eslint-disable-next-line no-console
    console.log(`server run on http://localhost:${PORT}`);
  } else {
    // eslint-disable-next-line no-console
    console.error(error);
  }
});
