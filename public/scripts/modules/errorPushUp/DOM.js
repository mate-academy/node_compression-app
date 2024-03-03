export function createErrorElement(message, onClose) {
  const errorNode = document.createElement('div');
  const closeButton = document.createElement('button');
  const messageNode = document.createTextNode(message);
  const timeoutId = setTimeout(close, 5000);
  
  function close(event) {
    errorNode.classList.add('hide');
    clearTimeout(timeoutId);

    setTimeout(onClose, 500, event);
  }
  
  closeButton.onclick = close;
  closeButton.classList.add('close-error-btn');
  closeButton.textContent = '×';
  
  errorNode.classList.add('error-popup');
  errorNode.appendChild(closeButton);
  errorNode.appendChild(messageNode);
  return errorNode;
}
