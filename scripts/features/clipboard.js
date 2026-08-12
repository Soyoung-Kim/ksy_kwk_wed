import { copyText } from '../utils.js';

export function initClipboard() {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy]');
    if (!button) return;
    await copyText(button.getAttribute('data-copy') || '');
  });
}
