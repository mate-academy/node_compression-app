import { downloadFile } from "../../helpers/downloadFile.js";
import { errorHandler } from "../errorPushUp/index.js";
import { setProgress, setProgressVisibility } from "../progressBar/DOM.js";
import { disableForm } from './DOM.js';

export function requestWithProgress(form) {
  const xhr = new XMLHttpRequest();
  const formData = new FormData(form);

  xhr.open('POST', '/compress');
  xhr.responseType = 'blob';
  
  xhr.onloadstart = () => {
    setProgressVisibility(true);
    setProgress(0);
    disableForm(true);
  };

  xhr.upload.onprogress = (event) => {
    const { loaded, total } = event;
    const percent = (loaded / total) * 50;

    setProgress(percent);
  };

  xhr.onprogress = (event) => {
    const { loaded } = event;
    const total = xhr.getResponseHeader('Predicted-Length');
    const percent = 50 + (loaded / total) * 50;

    setProgress(percent);
  };

  xhr.onload = () => {
    if (xhr.status < 400) {
      const contentType = xhr.getResponseHeader('Content-Type');
      const fileName = xhr.getResponseHeader('Content-Disposition').split('filename=')[1];

      downloadFile(xhr.response, contentType, fileName);
      setProgress(100);
    } else {
      errorHandler(xhr.response);
    }

    disableForm(false);
    setProgressVisibility(false);
  };

  xhr.onerror = () => {
    errorHandler(xhr.response || 'Network error. Please check your connection');
    disableForm(false);
    setProgressVisibility(false);
  };

  xhr.send(formData);
}
