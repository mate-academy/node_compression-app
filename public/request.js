/* eslint-disable no-console */
'use strict';

const form = document.querySelector('form#compressionForm');

console.log('Form found:', form);

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const compressValue = document.querySelector('select#compressionType');
  const fileElem = document.querySelector('input#submittedFile');

  if (!compressValue || !fileElem || !fileElem.files) {
    return;
  }

  if (fileElem.files.length === 0) {
    console.error('No file selected');

    return;
  }

  try {
    const selectedFile = fileElem.files[0];
    const compressionType = compressValue.value;

    const response = await fetch('/compress', {
      method: 'POST',
      headers: {
        'compression-type': compressionType,
        'file-name': selectedFile.name,
        'content-type': selectedFile.type || 'application/octet-stream',
      },
      body: selectedFile,
    });

    if (!response.ok) {
      console.error('Error from server', await response.text());

      return;
    }

    const compressionExt = {
      'gzip': '.gz',
      'deflate': '.dfl',
      'br': '.br',
    }[compressionType];

    const downloadLink = document.createElement('a');
    const originalName = selectedFile.name;

    downloadLink.href = URL.createObjectURL(await response.blob());
    downloadLink.download = `${originalName}${compressionExt}`;
    downloadLink.click();
  } catch (error) {
    console.error('Request failed:', error);
  }
});
