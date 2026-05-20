'use strict';

const { endpoints, htmlNames, compMethods } = require('./constants');

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

    const compression = url.searchParams.get(htmlNames.comp);

    if (!compression) {
      return getValidationError(400, `Expected compression method`);
    }

    if (!Object.values(compMethods).includes(compression)) {
      return getValidationError(400, `Unsupported compression method`);
    }

    return {
      ok: true,
      pathname: url.pathname,
      compression: compression,
    };
  }

  return {
    ok: true,
    pathname: url.pathname,
  };
};

module.exports = { validate };
