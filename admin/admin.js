import { supabaseClient } from '../scripts/supabaseClient.js';

const GALLERY_BUCKET = 'wedding-gallery';
const state = { contacts: [], accounts: [], gallery: [] };
const els = {
  loginView: document.getElementById('login-view'), adminView: document.getElementById('admin-view'),
  loginForm: document.getElementById('login-form'), loginId: document.getElementById('login-id'),
  loginPassword: document.getElementById('login-password'), loginStatus: document.getElementById('login-status'),
  adminStatus: document.getElementById('admin-status'), contacts: document.getElementById('contacts-list'),
  accounts: document.getElementById('accounts-list'), gallery: document.getElementById('gallery-list'),
  uploadForm: document.getElementById('gallery-upload-form'), uploadFile: document.getElementById('gallery-file'),
  uploadAlt: document.getElementById('gallery-alt'), logout: document.getElementById('logout-button')
};

function setStatus(message = '', login = false) { (login ? els.loginStatus : els.adminStatus).textContent = message; }
function field(label, name, value, type = 'text', wide = false) {
  const wrap = document.createElement('label');
  if (wide) wrap.className = 'wide';
  wrap.textContent = label;
  const input = document.createElement('input');
  input.name = name; input.type = type; input.value = value ?? '';
  wrap.append(input); return wrap;
}
function visibility(checked) {
  const label = document.createElement('label'); label.className = 'visibility';
  const input = document.createElement('input'); input.type = 'checkbox'; input.name = 'is_visible'; input.checked = checked;
  label.append(input, document.createTextNode('청첩장에 표시')); return label;
}
function button(text, className = '') { const el = document.createElement('button'); el.type = 'submit'; el.textContent = text; el.className = className; return el; }
function formValue(form, name) { return new FormData(form).get(name)?.toString().trim() || ''; }
function previewUrl(imageUrl) { return imageUrl.startsWith('./assets/') ? `../${imageUrl.slice(2)}` : imageUrl; }
function resolveLoginEmail(value) {
  const normalized = value.trim().toLowerCase();
  return normalized.includes('@') ? normalized : '';
}

function renderContacts() {
  els.contacts.replaceChildren();
  state.contacts.forEach((row) => {
    const form = document.createElement('form'); form.className = 'editor-card';
    const head = document.createElement('div'); head.className = 'editor-card-head';
    const title = document.createElement('strong'); title.textContent = `${row.side === 'groom' ? '신랑측' : '신부측'} · ${row.role_label}`;
    const hint = document.createElement('span'); hint.textContent = `순서 ${row.display_order}`; head.append(title, hint);
    const fields = document.createElement('div'); fields.className = 'editor-fields';
    fields.append(field('이름', 'name', row.name), field('휴대전화', 'phone', row.phone));
    form.append(head, fields, visibility(row.is_visible));
    const actions = document.createElement('div'); actions.className = 'editor-actions'; actions.append(button('저장'));
    form.append(actions);
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); setStatus('연락처를 저장하는 중입니다.');
      const { error } = await supabaseClient.from('wedding_contacts').update({ name: formValue(form, 'name'), phone: formValue(form, 'phone'), is_visible: form.elements.is_visible.checked }).eq('id', row.id);
      if (error) return setStatus(error.message);
      setStatus('연락처를 저장했습니다.'); await loadData();
    });
    els.contacts.append(form);
  });
}

function renderAccounts() {
  els.accounts.replaceChildren();
  state.accounts.forEach((row) => {
    const form = document.createElement('form'); form.className = 'editor-card';
    const head = document.createElement('div'); head.className = 'editor-card-head';
    const title = document.createElement('strong'); title.textContent = `${row.side === 'groom' ? '신랑측' : '신부측'} · ${row.side_label}`;
    const hint = document.createElement('span'); hint.textContent = `순서 ${row.display_order}`; head.append(title, hint);
    const fields = document.createElement('div'); fields.className = 'editor-fields';
    fields.append(field('은행명', 'bank_name', row.bank_name), field('예금주', 'account_holder', row.account_holder), field('계좌번호', 'account_number', row.account_number, 'text', true));
    form.append(head, fields, visibility(row.is_visible));
    const actions = document.createElement('div'); actions.className = 'editor-actions'; actions.append(button('저장'));
    form.append(actions);
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); setStatus('계좌 정보를 저장하는 중입니다.');
      const bankName = formValue(form, 'bank_name');
      const { error } = await supabaseClient.from('wedding_accounts').update({ bank_name: bankName || null, account_holder: formValue(form, 'account_holder'), account_number: formValue(form, 'account_number'), is_visible: form.elements.is_visible.checked }).eq('id', row.id);
      if (error) return setStatus(error.message);
      setStatus('계좌 정보를 저장했습니다.'); await loadData();
    });
    els.accounts.append(form);
  });
}

function renderGallery() {
  els.gallery.replaceChildren();
  state.gallery.forEach((row) => {
    const form = document.createElement('form'); form.className = 'gallery-editor-card';
    const image = document.createElement('img'); image.src = previewUrl(row.image_url); image.alt = row.alt;
    const fields = document.createElement('div'); fields.className = 'editor-fields';
    fields.append(field('설명', 'alt', row.alt), field('순서', 'display_order', row.display_order, 'number'), visibility(row.is_visible));
    const remove = button('삭제', 'danger'); remove.type = 'button';
    remove.addEventListener('click', async () => {
      if (!window.confirm('이 사진을 갤러리에서 삭제할까요?')) return;
      setStatus('사진을 삭제하는 중입니다.');
      if (row.storage_path) await supabaseClient.storage.from(GALLERY_BUCKET).remove([row.storage_path]);
      const { error } = await supabaseClient.from('wedding_gallery').delete().eq('id', row.id);
      if (error) return setStatus(error.message);
      setStatus('사진을 삭제했습니다.'); await loadData();
    });
    form.append(image, fields, remove);
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); setStatus('사진 정보를 저장하는 중입니다.');
      const { error } = await supabaseClient.from('wedding_gallery').update({ alt: formValue(form, 'alt'), display_order: Number(formValue(form, 'display_order')) || 0, is_visible: form.elements.is_visible.checked }).eq('id', row.id);
      if (error) return setStatus(error.message);
      setStatus('사진 정보를 저장했습니다.'); await loadData();
    });
    els.gallery.append(form);
  });
}

async function loadData() {
  setStatus('관리 정보를 불러오는 중입니다.');
  const [contacts, accounts, gallery] = await Promise.all([
    supabaseClient.from('wedding_contacts').select('id, side, contact_type, role_label, name, phone, display_order, is_visible').order('display_order'),
    supabaseClient.from('wedding_accounts').select('id, side, side_label, bank_name, account_holder, account_number, display_order, is_visible').order('display_order'),
    supabaseClient.from('wedding_gallery').select('*').order('display_order')
  ]);
  const error = contacts.error || accounts.error || gallery.error;
  if (error) return setStatus(`관리 정보를 불러오지 못했습니다: ${error.message}`);
  state.contacts = contacts.data || []; state.accounts = accounts.data || []; state.gallery = gallery.data || [];
  renderContacts(); renderAccounts(); renderGallery(); setStatus('');
}

async function showForSession(session) {
  if (!session) { els.loginView.hidden = false; els.adminView.hidden = true; return; }
  const { data, error } = await supabaseClient.from('wedding_admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (error || !data) {
    await supabaseClient.auth.signOut();
    els.loginView.hidden = false; els.adminView.hidden = true;
    setStatus('관리자 권한이 없는 계정입니다.', true); return;
  }
  els.loginView.hidden = true; els.adminView.hidden = false; await loadData();
}

els.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = resolveLoginEmail(els.loginId.value);
  if (!email) return setStatus('Supabase에 등록한 이메일을 입력해주세요.', true);
  setStatus('로그인하는 중입니다.', true);
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password: els.loginPassword.value });
  if (error) setStatus('아이디 또는 비밀번호를 확인해주세요.', true);
});
els.logout.addEventListener('click', () => supabaseClient.auth.signOut());
els.uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault(); const file = els.uploadFile.files?.[0]; if (!file) return;
  const extension = file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';
  const storagePath = `gallery/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  setStatus('사진을 업로드하는 중입니다.');
  const { error: uploadError } = await supabaseClient.storage.from(GALLERY_BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return setStatus(uploadError.message);
  const { data: urlData } = supabaseClient.storage.from(GALLERY_BUCKET).getPublicUrl(storagePath);
  const nextOrder = Math.max(0, ...state.gallery.map((item) => item.display_order || 0)) + 10;
  const { error } = await supabaseClient.from('wedding_gallery').insert({ image_url: urlData.publicUrl, storage_path: storagePath, alt: els.uploadAlt.value.trim() || '웨딩 사진', display_order: nextOrder });
  if (error) return setStatus(error.message);
  els.uploadForm.reset(); els.uploadAlt.value = '웨딩 사진'; setStatus('사진을 추가했습니다.'); await loadData();
});

if (!supabaseClient) setStatus('Supabase 설정을 찾을 수 없습니다.', true);
else {
  supabaseClient.auth.onAuthStateChange((_event, session) => { showForSession(session); });
  supabaseClient.auth.getSession().then(({ data }) => showForSession(data.session));
}
