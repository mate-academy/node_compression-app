export function createEnableHandler(element, eventName, handler) {
  return (enable = true) => {
    if (enable) {
      element.addEventListener(eventName, handler);
    } else {
      element.removeEventListener(eventName, handler);
    }
  };
}