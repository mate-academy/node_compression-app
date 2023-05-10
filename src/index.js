'use strict';

const fileInput = document.querySelector('.file-input');
const sendButton = document.querySelector('.file-form_button');
const compressionTypeSelect = document.querySelector('.file-form_select');

sendButton.onclick = async() => {
  if (!fileInput.files[0]) {
    // eslint-disable-next-line no-console
    console.log('File is absent');
  };

  // eslint-disable-next-line no-undef
  const formData = new FormData();

  formData.append('data', JSON
    .stringify({ type: compressionTypeSelect.value }));

  formData.append('file', fileInput.files[0]);

  const options = {
    method: 'POST',
    body: formData,
  };

  try {
    // eslint-disable-next-line no-undef
    const res = await fetch('http://localhost:5001', options);

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;

    link.download = 'some_file.jpg';

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
  }
};
