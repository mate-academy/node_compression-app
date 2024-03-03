'use strict';

function setContentAttachment(res, filename) {
  const encodedFilename = encodeURIComponent(filename);

  res.setHeader(
    'Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`
  );
};

module.exports = { setContentAttachment };
