/* eslint-disable no-console */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('compressForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    try {
      const response = await fetch('http://localhost:5700/compress', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();

        console.error(text);

        return;
      }

      const disposition = response.headers.get('Content-Disposition');
      let fileName = disposition;

      if (disposition) {
        const matches = disposition.match(/filename="?([^"]+)"?/);

        if (matches && matches[1]) {
          fileName = matches[1];
        }
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error:', err);
    }
  });
});
