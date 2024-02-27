
import { progress, progressContainer } from './nodes.js';

export function setProgress(percent) {
  if (percent <= 100 && percent >= 0) {
    progress.style.width = `${percent}%`;
  }
}

export function setProgressVisibility(show) {
  progressContainer.classList[show ? 'add' : 'remove']('progress-bar-show');
}
