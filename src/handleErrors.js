'use strict';

const handleErrors = (res, err) => {
  if (err) {
    res.statusCode = 500;
    res.end('Internal Server Error');
  } else {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('No file to compress');
  }
};

module.exports = {
  handleErrors,
};
