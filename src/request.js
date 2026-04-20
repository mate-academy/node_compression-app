/* eslint-disable no-console */

const BASE = 'http://localhost:5700';

const form = document.getElementById('uploadForm');
const statusMessage = document.getElementById('status');

console.log('js is work!');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];

  if (!file) {
    statusMessage.innerText = 'Please select a file!';

    return;
  }

  const formData = new FormData();

  formData.append('file', file);

  try {
    // eslint-disable-next-line no-undef
    const response = await axios.post(`${BASE}/compress`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
    });

    const blob = response.data;
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = `compressed_${file.name}.gz`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    statusMessage.innerText = 'File compressed and downloaded!';
  } catch (error) {
    console.error('Upload error:', error);
    statusMessage.innerText = 'An error occurred!';
  }
});
