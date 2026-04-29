import { APP_CONFIG } from '../config.js';
import {
  supabaseClient,
  hasSupabaseConfig,
  getFunctionHeaders,
} from '../supabaseClient.js';

const GUESTBOOK_SELECT_COLUMNS =
  'id, side, display_name, message, created_at, updated_at';

const state = {
  selectedSide: 'groom',
  editId: null,
  submitting: false,
  entries: new Map(),
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatGuestbookDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');

  return `${yy}.${mm}.${dd} ${hh}:${mi}`;
}

function showToast(message) {
  if (!message) return;
  window.alert(message);
}

function getGuestbookConfig() {
  return {
    table: APP_CONFIG?.guestbook?.table || 'guestbook_entries',
    functions: {
      create: APP_CONFIG?.guestbook?.functions?.create || 'guestbook-create',
      update: APP_CONFIG?.guestbook?.functions?.update || 'guestbook-update',
      delete: APP_CONFIG?.guestbook?.functions?.delete || 'guestbook-delete',
    },
  };
}

const els = {};

function cacheElements() {
  els.root = $('#guestbook');
  els.status = $('#guestbook-status');
  els.openButton = $('#guestbook-open-btn');
  els.formPanel = $('#guestbook-form-panel');
  els.formTitle = $('#guestbook-form-title');
  els.formCaption = $('#guestbook-form-caption');
  els.form = $('#guestbook-form');
  els.editId = $('#guestbook-edit-id');
  els.name = $('#guestbook-name');
  els.message = $('#guestbook-message');
  els.password = $('#guestbook-password');
  els.cancelButton = $('#guestbook-cancel-btn');
  els.submitButton = $('#guestbook-submit-btn');
  els.list = $('#guestbook-list');
  els.sideButtons = $$('#guestbook-side-picker [data-side]');
}

function setStatus(message = '', tone = 'neutral') {
  if (!els.status) return;

  els.status.textContent = message;
  els.status.classList.remove(
    'is-loading',
    'is-success',
    'is-error',
    'is-neutral'
  );

  if (tone) {
    els.status.classList.add(`is-${tone}`);
  }
}

function getSelectedSideLabel(side) {
  return side === 'bride' ? '신부 지인' : '신랑 지인';
}

function setSelectedSide(side) {
  state.selectedSide = side === 'bride' ? 'bride' : 'groom';

  els.sideButtons.forEach((button) => {
    const active = button.dataset.side === state.selectedSide;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function openForm(mode = 'create') {
  if (!els.formPanel) return;

  els.formPanel.hidden = false;

  if (mode === 'edit') {
    els.formTitle.textContent = '방명록 수정';
    els.formCaption.textContent =
      '등록할 때 입력한 비밀번호를 다시 입력해 주세요.';
    els.submitButton.textContent = '수정 완료';
  } else {
    els.formTitle.textContent = '방명록 남기기';
    els.formCaption.textContent = '축하 메시지를 남겨 주세요.';
    els.submitButton.textContent = '작성 완료';
  }

  requestAnimationFrame(() => {
    els.name?.focus();
  });
}

function closeForm() {
  state.editId = null;

  if (els.editId) els.editId.value = '';
  if (els.form) els.form.reset();

  setSelectedSide('groom');

  if (els.formPanel) {
    els.formPanel.hidden = true;
  }

  if (els.formTitle) {
    els.formTitle.textContent = '방명록 남기기';
  }

  if (els.formCaption) {
    els.formCaption.textContent = '축하 메시지를 남겨 주세요.';
  }

  if (els.submitButton) {
    els.submitButton.textContent = '작성 완료';
    els.submitButton.disabled = false;
  }

  if (els.cancelButton) {
    els.cancelButton.disabled = false;
  }

  if (els.openButton) {
    els.openButton.disabled = false;
  }

  setStatus('', 'neutral');
}

function setSubmitting(flag) {
  state.submitting = flag;

  if (els.submitButton) {
    els.submitButton.disabled = flag;
    if (flag) {
      els.submitButton.textContent = state.editId ? '수정 중...' : '등록 중...';
    } else {
      els.submitButton.textContent = state.editId ? '수정 완료' : '작성 완료';
    }
  }

  if (els.cancelButton) els.cancelButton.disabled = flag;
  if (els.openButton) els.openButton.disabled = flag;
}

function buildEntryCard(entry) {
  const sideClass = entry.side === 'bride' ? 'bride' : 'groom';
  const sideLabel = getSelectedSideLabel(entry.side);

  return `
    <article class="guestbook-card" data-id="${entry.id}">
      <div class="guestbook-card-head">
        <div class="guestbook-meta">
          <span class="guestbook-side guestbook-side--${sideClass}">
            ${escapeHtml(sideLabel)}
          </span>
          <strong class="guestbook-name">
            ${escapeHtml(entry.display_name)}
          </strong>
        </div>
        <time class="guestbook-date" datetime="${escapeHtml(entry.created_at)}">
          ${escapeHtml(formatGuestbookDate(entry.created_at))}
        </time>
      </div>

      <p class="guestbook-message">
        ${escapeHtml(entry.message).replace(/\n/g, '<br />')}
      </p>

      <div class="guestbook-card-actions">
        <button
          type="button"
          class="guestbook-card-btn"
          data-action="edit"
          data-id="${entry.id}"
        >
          수정
        </button>
        <button
          type="button"
          class="guestbook-card-btn danger"
          data-action="delete"
          data-id="${entry.id}"
        >
          삭제
        </button>
      </div>
    </article>
  `;
}

function renderGuestbook(entries = []) {
  if (!els.list) return;

  state.entries.clear();
  entries.forEach((entry) => {
    state.entries.set(entry.id, entry);
  });

  if (!entries.length) {
    els.list.innerHTML = `
      <div class="guestbook-empty-card">
        아직 등록된 방명록이 없습니다.<br />
        첫 번째 축하 메시지를 남겨 주세요.
      </div>
    `;
    return;
  }

  els.list.innerHTML = entries.map(buildEntryCard).join('');
}

function getFunctionUrl(functionName) {
  return `${APP_CONFIG.supabaseUrl}/functions/v1/${functionName}`;
}

async function invokeEdgeFunction(functionName, payload) {
  const response = await fetch(getFunctionUrl(functionName), {
    method: 'POST',
    headers: getFunctionHeaders(),
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result?.success === false) {
    throw new Error(result?.error || '요청 처리에 실패했습니다.');
  }

  return result;
}

async function loadGuestbook() {
  if (!hasSupabaseConfig || !supabaseClient) {
    renderGuestbook([]);
    setStatus(
      'Supabase 설정이 아직 완료되지 않았습니다. config.js를 확인해 주세요.',
      'error'
    );
    return;
  }

  setStatus('방명록을 불러오는 중입니다.', 'loading');

  try {
    const { table } = getGuestbookConfig();

    const { data, error } = await supabaseClient
      .from(table)
      .select(GUESTBOOK_SELECT_COLUMNS)
      .order('created_at', { ascending: false });

    if (error) throw error;

    renderGuestbook(data || []);
    setStatus('', 'neutral');
  } catch (error) {
    console.error('[guestbook] load error:', error);
    renderGuestbook([]);
    setStatus(
      '방명록을 불러오지 못했습니다. SQL / RLS / 키 설정을 확인해 주세요.',
      'error'
    );
  }
}

function validateForm() {
  const displayName = (els.name?.value || '').trim();
  const message = (els.message?.value || '').trim();
  const password = (els.password?.value || '').trim();

  if (!displayName) throw new Error('이름을 입력해 주세요.');
  if (displayName.length > 20) throw new Error('이름은 20자 이하로 입력해 주세요.');

  if (!message) throw new Error('축하 메시지를 입력해 주세요.');
  if (message.length > 300) throw new Error('메시지는 300자 이하로 입력해 주세요.');

  if (!password) throw new Error('비밀번호를 입력해 주세요.');
  if (password.length < 4) throw new Error('비밀번호는 4자 이상이어야 합니다.');

  return {
    side: state.selectedSide,
    display_name: displayName,
    message,
    password,
  };
}

function fillFormForEdit(entry) {
  state.editId = entry.id;
  if (els.editId) els.editId.value = entry.id;
  if (els.name) els.name.value = entry.display_name || '';
  if (els.message) els.message.value = entry.message || '';
  if (els.password) els.password.value = '';

  setSelectedSide(entry.side || 'groom');
  openForm('edit');
  setStatus('수정 내용을 입력한 뒤 비밀번호를 다시 입력해 주세요.', 'neutral');
}

async function handleSubmit(event) {
  event.preventDefault();
  if (state.submitting) return;

  try {
    const payload = validateForm();
    const { functions } = getGuestbookConfig();

    setSubmitting(true);

    if (state.editId) {
      setStatus('방명록을 수정하는 중입니다.', 'loading');
      await invokeEdgeFunction(functions.update, {
        id: state.editId,
        ...payload,
      });
      showToast('방명록이 수정되었습니다.');
    } else {
      setStatus('방명록을 등록하는 중입니다.', 'loading');
      await invokeEdgeFunction(functions.create, payload);
      showToast('방명록이 등록되었습니다.');
    }

    await loadGuestbook();
    closeForm();
  } catch (error) {
    console.error('[guestbook] submit error:', error);
    setStatus(
      error instanceof Error ? error.message : '방명록 저장에 실패했습니다.',
      'error'
    );
  } finally {
    setSubmitting(false);
  }
}

async function handleDelete(id) {
  const entry = state.entries.get(id);
  if (!entry) return;

  const password = window.prompt(
    `${entry.display_name}님의 방명록을 삭제하려면 비밀번호를 입력해 주세요.`
  );

  if (password === null) return;
  if (!password.trim()) {
    showToast('비밀번호를 입력해야 삭제할 수 있습니다.');
    return;
  }

  try {
    setStatus('방명록을 삭제하는 중입니다.', 'loading');

    const { functions } = getGuestbookConfig();

    await invokeEdgeFunction(functions.delete, {
      id,
      password: password.trim(),
    });

    showToast('방명록이 삭제되었습니다.');
    await loadGuestbook();
  } catch (error) {
    console.error('[guestbook] delete error:', error);
    setStatus(
      error instanceof Error ? error.message : '방명록 삭제에 실패했습니다.',
      'error'
    );
  }
}

function bindSideButtons() {
  els.sideButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const side = button.dataset.side;
      if (side !== 'groom' && side !== 'bride') return;
      setSelectedSide(side);
    });
  });
}

function bindOpenClose() {
  els.openButton?.addEventListener('click', () => {
    state.editId = null;
    openForm('create');
  });

  els.cancelButton?.addEventListener('click', () => {
    closeForm();
  });
}

function bindListActions() {
  els.list?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const { action, id } = button.dataset;
    if (!id) return;

    if (action === 'edit') {
      const entry = state.entries.get(id);
      if (!entry) return;
      fillFormForEdit(entry);
      return;
    }

    if (action === 'delete') {
      await handleDelete(id);
    }
  });
}

export async function initGuestbook() {
  cacheElements();

  if (!els.root) return;

  bindSideButtons();
  bindOpenClose();
  bindListActions();
  els.form?.addEventListener('submit', handleSubmit);

  setSelectedSide('groom');
  closeForm();
  await loadGuestbook();
}