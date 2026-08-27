import { supabaseClient } from '../supabaseClient.js';

const TOKEN_KEY = 'wedding-rsvp-client-token';

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function getClientToken() {
  try {
    let token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID();
      window.localStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch {
    return crypto.randomUUID();
  }
}

export function initRsvp() {
  const modal = document.getElementById('rsvp-modal');
  const openButton = document.getElementById('rsvp-open-button');
  const form = document.getElementById('rsvp-form');
  const status = document.getElementById('rsvp-status');
  const submitButton = document.getElementById('rsvp-submit-button');
  const countField = document.getElementById('rsvp-guest-count-field');
  if (!modal || !openButton || !form || !status || !submitButton || !countField) return;

  const token = getClientToken();
  const setAttendanceUi = () => {
    const attending = new FormData(form).get('attendance') === 'attending';
    countField.hidden = !attending;
    countField.querySelector('select').disabled = !attending;
  };
  const close = () => { modal.hidden = true; document.body.style.overflow = ''; openButton.focus(); };
  const open = () => { modal.hidden = false; document.body.style.overflow = 'hidden'; setAttendanceUi(); form.querySelector('input[name="attendance"]')?.focus(); };

  try {
    if (window.localStorage.getItem(`${TOKEN_KEY}-submitted`) === 'true') openButton.textContent = '참석 여부 수정하기';
  } catch { /* local storage can be unavailable in private browsing */ }

  openButton.addEventListener('click', open);
  modal.addEventListener('click', (event) => { if (event.target.closest('[data-rsvp-close]')) close(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) close(); });
  form.addEventListener('change', (event) => { if (event.target.name === 'attendance') setAttendanceUi(); });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!supabaseClient) { status.textContent = '응답 기능을 준비하지 못했습니다. 잠시 후 다시 시도해주세요.'; return; }
    const values = new FormData(form);
    if (values.get('website')) { status.textContent = '응답을 저장할 수 없습니다.'; return; }
    const attendance = String(values.get('attendance'));
    const guestCount = attendance === 'attending' ? Number(values.get('guest_count')) : 0;
    submitButton.disabled = true;
    submitButton.textContent = '저장 중…';
    status.textContent = '';
    const { error } = await supabaseClient.rpc('submit_wedding_rsvp', {
      p_client_token: token,
      p_attendance: attendance,
      p_guest_count: guestCount,
      p_name: String(values.get('name') || '').trim(),
      p_message: String(values.get('message') || '').trim(),
      p_website: ''
    });
    submitButton.disabled = false;
    submitButton.textContent = '응답 저장하기';
    if (error) { status.textContent = `저장에 실패했습니다: ${error.message}`; return; }
    try { window.localStorage.setItem(`${TOKEN_KEY}-submitted`, 'true'); } catch { /* no-op */ }
    openButton.textContent = '참석 여부 수정하기';
    close();
    showToast('참석 여부를 저장했습니다. 감사합니다.');
  });
}
