export function qs(selector) {
  return document.querySelector(selector);
}

export function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function pad(num) {
  return String(num).padStart(2, '0');
}

export function showToast(message) {
  const toast = qs('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('show'), 1800);
}

export async function copyText(text, successMessage = '복사되었습니다.') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch {
    window.prompt('아래 내용을 복사해 주세요.', text);
  }
}

export function formatGuestbookDate(isoString) {
  const date = new Date(isoString);
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}
