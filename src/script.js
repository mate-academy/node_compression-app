const fileInput = document.getElementById('file');
const fileInfo = document.getElementById('fileInfo');
const submitBtn = document.getElementById('submitBtn');
const form = document.getElementById('compressForm');

function formatFileSize(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function extractFilename(contentDisposition) {
  if (!contentDisposition) {
    return 'compressed-file';
  }

  const rfc5987Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);

  if (rfc5987Match && rfc5987Match[1]) {
    return decodeURIComponent(rfc5987Match[1]);
  }

  const filenameMatch = contentDisposition.match(
    /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
  );

  if (filenameMatch && filenameMatch[1]) {
    return filenameMatch[1].replace(/['"]/g, '');
  }

  return 'compressed-file';
}

function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(link);
}

function resetButton(originalText) {
  submitBtn.disabled = false;
  submitBtn.textContent = originalText;
}

function clearFileInfo() {
  fileInfo.textContent = '';
  fileInfo.classList.remove('show');
}

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];

  if (file) {
    fileInfo.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;
    fileInfo.classList.add('show');
  } else {
    clearFileInfo();
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const originalText = submitBtn.textContent;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Compressing...';

  try {
    const response = await fetch('/compress', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition');
    const filename = extractFilename(contentDisposition);

    downloadFile(blob, filename);
    resetButton(originalText);
    form.reset();
    clearFileInfo();
  } catch (error) {
    window.alert(`Error: ${error.message}`);
    resetButton(originalText);
  }
});
