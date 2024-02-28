export function downloadFile(binary, type, fileName) {
  const file = new Blob([binary], { type });
  const url = URL.createObjectURL(file);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
