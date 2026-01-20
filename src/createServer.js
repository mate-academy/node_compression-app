'use strict';
import http from 'http';
import fs from 'fs';

const endpoints = {
  home: '/',
  compress: '/compress',
};

const compMethods = {
  gzip: 'gzip',
  deflate: 'deflate',
  brotli: 'br',
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
    <form action="${endpoints.compress}" method="post" enctype="multipart/form-data">
        <label>
            File: 
            <input type="file" name="file" required>
        </label>
        
        <label>
            Compression: 
            <select name="compressionType" value="" required>
                <option value="${compMethods.gzip}">${compMethods.gzip}</option>
                <option value="${compMethods.deflate}">${compMethods.deflate}</option>
                <option value="${compMethods.brotli}">${compMethods.brotli}</option>
            </select> 
        </label>
        
        <button type="submit">Compress</button>
    </form>
</body>
</html>
`;

const processor = {
  [endpoints.home]: (res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(index);
  },
  [endpoints.compress]: (req, res) => {
    const fileStream = fs.createReadStream(req);

    fileStream.on('data', (chunk) => {
      res.write(chunk);
    });
  },
};

function createServer() {
  return http.createServer((req, res) => {
    const validated = validate(req);

    if (!validated.ok) {
      res.statusCode = validated.statusCode;
      res.end(validated.message);
    }

    processor[validated.pathname](req);
  });
}

module.exports = {
  createServer,
};

const getValidationError = (statusCode, message) => {
  return {
    ok: false,
    statusCode: statusCode,
    message: message,
  };
};

const validate = (req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (!Object.values(endpoints).includes(url.pathname)) {
    return getValidationError(404, `Endpoint doesn't exist: ${url.pathname}`);
  }

  if (url.pathname === endpoints.compress) {
    if (req.method !== 'POST') {
      return getValidationError(
        400,
        `Bad request: unsupported method ${req.method}`,
      );
    }

    if (!req.file || !req.compressionType) {
      return getValidationError(400, `Invalid form`);
    }

    if (!Object.keys(compMethods).includes(req.compressionType)) {
      return getValidationError(400, `Unsupported compression method`);
    }
  }

  return {
    ok: true,
    pathname: url.pathname,
  };
};
