import { setProgress, setProgressVisibility } from "../progressBar/DOM.js";
import { disableForm } from './DOM.js';

export function requestWithProgress(form) {
  const xhr = new XMLHttpRequest();
  const formData = new FormData(form);

  formData.delete('file');

  xhr.open('POST', '/compress');

  xhr.onloadstart = () => {
    setProgressVisibility(true);
    setProgress(0);
    disableForm(true);
  };

  xhr.upload.onprogress = (event) => {
    const { loaded, total } = event;
    const percent = (loaded / total) * 50;

    console.log('Uploaded: ', percent * 2);

    setProgress(percent);
  };

  xhr.onprogress = (event) => {
    const { loaded } = event;
    const total = xhr.getResponseHeader('Predicted-Length');
    const percent = 50 + (loaded / total) * 50;

    console.log('Downloaded: ', (percent - 50) * 2);

    setProgress(percent);
  };

  xhr.onload = () => {
    if (xhr.status < 400) {
      console.log('Was successful');
      setProgress(100);
    } else {
      console.log('Was not successful', xhr.response);
    }

    disableForm(false);
    setProgressVisibility(false);
  };

  xhr.onerror = (error) => {
    console.log('Error', error);
  };

  xhr.send(formData);
}
