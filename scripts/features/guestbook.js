import { APP_CONFIG } from '../../config.js';
import { supabaseClient, hasSupabaseConfig, getFunctionHeaders } from '../supabaseClient.js';
import { qs, qsa, escapeHtml, showToast, formatGuestbookDate } from '../utils.js';

const GUESTBOOK_SELECT_COLUMNS = 'id, side, display_name, message, created_at, updated_at';
const PASSWORD_MIN_LENGTH = 4;
const PASSWORD_MAX_LENGTH = 20;

const state = {
  entries: [],
  selectedSide: '',
  editId: '',
  submitting: false,
  aiLoading: false,
  aiTarget: 'groom',
  aiVersion: 'friend',
  aiSuggestions: []
};

const els = {};

function cacheElements() {
  els.root = qs('#guestbook');
  els.status = qs('#guestbook-status');
  els.list = qs('#guestbook-list');
  els.openButton = qs('#guestbook-open-btn');
  els.formPanel = qs('#guestbook-form-panel');
  els.form = qs('#guestbook-form');
  els.formTitle = qs('#guestbook-form-title');
  els.formCaption = qs('#guestbook-form-caption');
  els.editId = qs('#guestbook-edit-id');
  els.name = qs('#guestbook-name');
  els.message = qs('#guestbook-message');
  els.password = qs('#guestbook-password');
  els.submitButton = qs('#guestbook-submit-btn');
  els.cancelButton = qs('#guestbook-cancel-btn');
  els.sideButtons = qsa('.guestbook-side-btn');
  els.editLock = qs('#guestbook-edit-lock');
  els.editCancelOverlayButton = qs('#guestbook-edit-cancel-overlay-btn');

  els.aiOpenButton = qs('#guestbook-ai-open');
  els.aiModal = qs('#guestbook-ai-modal');
  els.aiCloseButton = qs('#guestbook-ai-close');
  els.aiBackdrop = els.aiModal ? els.aiModal.querySelector('[data-ai-close="true"]') : null;
  els.aiTargetButtons = qsa('.guestbook-ai-target-btn');
  els.aiVersionButtons = qsa('.guestbook-ai-version-btn');
  els.aiStatus = qs('#guestbook-ai-status');
  els.aiList = qs('#guestbook-ai-list');
  els.aiRefreshButton = qs('#guestbook-ai-refresh');

  els.accountCopyButtons = qsa('.account-copy-btn');
}

function setStatus(message = '') {
  if (els.status) {
    els.status.textContent = message;
  }
}

function pickRandomSide() {
  return Math.random() < 0.5 ? 'groom' : 'bride';
}

function getSideLabel(side) {
  return side === 'groom' ? '신랑 지인' : '신부 지인';
}

function getBrideName() {
  return APP_CONFIG?.guestbook?.brideName || '소영';
}

function getGroomName() {
  return APP_CONFIG?.guestbook?.groomName || '우경';
}

function setSelectedSide(side) {
  state.selectedSide = side;

  els.sideButtons.forEach((button) => {
    const isActive = button.dataset.side === side;
    button.classList.toggle('is-groom-active', isActive && side === 'groom');
    button.classList.toggle('is-bride-active', isActive && side === 'bride');
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function resetForm() {
  state.editId = '';
  els.editId.value = '';
  els.name.value = '';
  els.message.value = '';
  els.password.value = '';
  els.formTitle.textContent = '방명록 남기기';
  els.formCaption.textContent = '따뜻한 축하의 말을 남겨주세요.';
  setSelectedSide(pickRandomSide());
  unlockGuestbookBoard();
}

function openCreateForm() {
  resetForm();
  els.formPanel.hidden = false;
  els.name.focus();
}

function closeForm() {
  els.formPanel.hidden = true;
  resetForm();
}

function lockGuestbookBoard() {
  if (els.editLock) {
    els.editLock.hidden = false;
  }

  qsa('.guestbook-entry-action').forEach((button) => {
    button.setAttribute('disabled', 'disabled');
  });
}

function unlockGuestbookBoard() {
  if (els.editLock) {
    els.editLock.hidden = true;
  }

  qsa('.guestbook-entry-action').forEach((button) => {
    button.removeAttribute('disabled');
  });
}

function fillFormForEdit(entry) {
  state.editId = entry.id;
  els.editId.value = entry.id;
  els.name.value = entry.display_name;
  els.message.value = entry.message;
  els.password.value = '';
  els.formTitle.textContent = '방명록 수정';
  els.formCaption.textContent = '수정 후 비밀번호를 다시 입력해주세요.';
  setSelectedSide(entry.side);
  els.formPanel.hidden = false;
  lockGuestbookBoard();
  els.name.focus();
}

function buildCard(entry) {
  return `
    <article class="guestbook-card" data-entry-id="${entry.id}">
      <div class="guestbook-card-head">
        <div class="guestbook-card-meta">
          <div class="guestbook-card-name">
            <span class="guestbook-side-badge ${entry.side}">${getSideLabel(entry.side)}</span>
            ${escapeHtml(entry.display_name)}
          </div>
          <div class="guestbook-card-date">${formatGuestbookDate(entry.created_at)}</div>
        </div>
      </div>

      <div class="guestbook-card-message">${escapeHtml(entry.message)}</div>

      <div class="guestbook-card-actions">
        <button
          type="button"
          class="button button-secondary guestbook-entry-action guestbook-entry-edit"
          data-action="edit"
          data-entry-id="${entry.id}"
        >
          수정
        </button>
        <button
          type="button"
          class="button button-secondary guestbook-entry-action guestbook-entry-delete"
          data-action="delete"
          data-entry-id="${entry.id}"
        >
          삭제
        </button>
      </div>
    </article>
  `;
}

function renderGuestbook() {
  if (!els.list) {
    return;
  }

  if (!state.entries.length) {
    els.list.innerHTML = `
      <div class="guestbook-card">
        <div class="guestbook-card-message">첫 번째 축하 메시지를 남겨주세요.</div>
      </div>
    `;
    return;
  }

  els.list.innerHTML = state.entries.map(buildCard).join('');
}

async function loadGuestbook() {
  if (!hasSupabaseConfig()) {
    setStatus('Supabase 설정이 비어 있습니다.');
    return;
  }

  setStatus('방명록을 불러오는 중입니다.');

  const { data, error } = await supabaseClient
    .from(APP_CONFIG.guestbook.table)
    .select(GUESTBOOK_SELECT_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    setStatus('방명록을 불러오지 못했습니다.');
    return;
  }

  state.entries = Array.isArray(data) ? data : [];
  renderGuestbook();
  setStatus(state.entries.length ? '' : '아직 등록된 방명록이 없습니다.');
}

function getFunctionUrl(functionName) {
  return `${APP_CONFIG.supabaseUrl}/functions/v1/${functionName}`;
}

async function invokeFunction(functionName, payload) {
  const response = await fetch(getFunctionUrl(functionName), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getFunctionHeaders()
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = result?.error || result?.message || '요청 처리에 실패했습니다.';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return result;
}

function validateForm() {
  const name = els.name.value.trim();
  const message = els.message.value.trim();
  const password = els.password.value.trim();

  if (!state.selectedSide) {
    showToast('신랑 지인 또는 신부 지인을 선택해주세요.');
    return null;
  }

  if (!name || name.length > 20) {
    showToast('이름은 1자 이상 20자 이하로 입력해주세요.');
    return null;
  }

  if (!message || message.length > 300) {
    showToast('메시지는 1자 이상 300자 이하로 입력해주세요.');
    return null;
  }

  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    showToast(`비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 ${PASSWORD_MAX_LENGTH}자 이하로 입력해주세요.`);
    return null;
  }

  return {
    side: state.selectedSide,
    display_name: name,
    message,
    password
  };
}

async function handleSubmit(event) {
  event.preventDefault();

  if (state.submitting) {
    return;
  }

  const payload = validateForm();
  if (!payload) {
    return;
  }

  state.submitting = true;
  els.submitButton.setAttribute('disabled', 'disabled');

  try {
    if (state.editId) {
      await invokeFunction(APP_CONFIG.guestbook.functions.update, {
        id: state.editId,
        ...payload
      });
      showToast('방명록이 수정되었습니다.');
    } else {
      await invokeFunction(APP_CONFIG.guestbook.functions.create, payload);
      showToast('방명록이 등록되었습니다.');
    }

    closeForm();
    await loadGuestbook();
  } catch (error) {
    console.error(error);

    if (error?.status === 404 || error?.status === 409) {
      showToast('이미 삭제되었거나 수정할 수 없는 글입니다.');
      closeForm();
      await loadGuestbook();
    } else {
      showToast(error?.message || '저장에 실패했습니다.');
    }
  } finally {
    state.submitting = false;
    els.submitButton.removeAttribute('disabled');
  }
}

async function handleDelete(entryId) {
  if (state.editId) {
    showToast('수정 중에는 다른 글을 삭제할 수 없습니다.');
    return;
  }

  const password = window.prompt('삭제에 사용할 비밀번호를 입력해주세요.');

  if (!password) {
    return;
  }

  if (password.trim().length < PASSWORD_MIN_LENGTH) {
    showToast(`비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`);
    return;
  }

  try {
    await invokeFunction(APP_CONFIG.guestbook.functions.delete, {
      id: entryId,
      password: password.trim()
    });

    showToast('방명록이 삭제되었습니다.');
    await loadGuestbook();
  } catch (error) {
    console.error(error);
    showToast(error?.message || '삭제에 실패했습니다.');
  }
}

function handleListClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) {
    return;
  }

  const entryId = button.dataset.entryId;
  const action = button.dataset.action;
  const entry = state.entries.find((item) => item.id === entryId);

  if (!entry) {
    showToast('이미 삭제되었거나 존재하지 않는 글입니다.');
    loadGuestbook();
    return;
  }

  if (action === 'edit') {
    fillFormForEdit(entry);
    return;
  }

  if (action === 'delete') {
    handleDelete(entryId);
  }
}

function setAiStatus(message) {
  if (els.aiStatus) {
    els.aiStatus.textContent = message;
  }
}

function setAiTarget(target) {
  state.aiTarget = target;

  els.aiTargetButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.aiTarget === target);
  });
}

function setAiVersion(version) {
  state.aiVersion = version;

  els.aiVersionButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.aiVersion === version);
  });
}

function renderAiSuggestions() {
  if (!els.aiList) {
    return;
  }

  if (!state.aiSuggestions.length) {
    els.aiList.innerHTML = '';
    return;
  }

  els.aiList.innerHTML = state.aiSuggestions
    .map(
      (text, index) => `
        <article class="guestbook-ai-item">
          <p class="guestbook-ai-item-text">${escapeHtml(text)}</p>
          <div class="guestbook-ai-item-actions">
            <button type="button" class="button button-secondary" data-ai-copy-index="${index}">복사</button>
            <button type="button" class="button button-primary" data-ai-apply-index="${index}">바로 입력</button>
          </div>
        </article>
      `
    )
    .join('');
}

async function loadAiSuggestions() {
  if (state.aiLoading) {
    return;
  }

  state.aiLoading = true;
  state.aiSuggestions = [];
  renderAiSuggestions();
  setAiStatus('AI 추천 문구를 불러오는 중입니다...');

  try {
    const result = await invokeFunction(APP_CONFIG.guestbook.functions.aiSuggest, {
      target: state.aiTarget,
      version: state.aiVersion,
      groomName: getGroomName(),
      brideName: getBrideName()
    });

    state.aiSuggestions = Array.isArray(result?.suggestions) ? result.suggestions : [];
    renderAiSuggestions();
    setAiStatus(state.aiSuggestions.length ? '추천 문구를 골라 바로 입력하거나 복사할 수 있어요.' : '추천 문구를 불러오지 못했습니다.');
  } catch (error) {
    console.error(error);
    setAiStatus(error?.message || '추천 문구를 불러오지 못했습니다.');
  } finally {
    state.aiLoading = false;
  }
}

function openAiModal() {
  if (!state.selectedSide) {
    setSelectedSide(pickRandomSide());
  }

  setAiTarget(state.selectedSide || 'groom');
  setAiVersion('friend');
  state.aiSuggestions = [];
  renderAiSuggestions();
  setAiStatus('대상과 버전을 선택하면 추천 문구를 불러옵니다.');
  els.aiModal.hidden = false;
  loadAiSuggestions();
}

function closeAiModal() {
  els.aiModal.hidden = true;
}

async function copyToClipboard(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch (error) {
    console.error(error);
    showToast('복사에 실패했습니다.');
  }
}

function bindEvents() {
  els.openButton?.addEventListener('click', openCreateForm);
  els.cancelButton?.addEventListener('click', closeForm);
  els.editCancelOverlayButton?.addEventListener('click', closeForm);
  els.form?.addEventListener('submit', handleSubmit);
  els.list?.addEventListener('click', handleListClick);

  els.sideButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setSelectedSide(button.dataset.side);
    });
  });

  els.accountCopyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      copyToClipboard(button.dataset.copy || '', '계좌정보를 복사했습니다.');
    });
  });

  els.aiOpenButton?.addEventListener('click', openAiModal);
  els.aiCloseButton?.addEventListener('click', closeAiModal);
  els.aiBackdrop?.addEventListener('click', closeAiModal);
  els.aiRefreshButton?.addEventListener('click', loadAiSuggestions);

  els.aiTargetButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      setAiTarget(button.dataset.aiTarget);
      await loadAiSuggestions();
    });
  });

  els.aiVersionButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      setAiVersion(button.dataset.aiVersion);
      await loadAiSuggestions();
    });
  });

  els.aiList?.addEventListener('click', async (event) => {
    const copyButton = event.target.closest('[data-ai-copy-index]');
    const applyButton = event.target.closest('[data-ai-apply-index]');

    if (copyButton) {
      const text = state.aiSuggestions[Number(copyButton.dataset.aiCopyIndex)];
      if (text) {
        await copyToClipboard(text, '추천 문구를 복사했습니다.');
      }
      return;
    }

    if (applyButton) {
      const text = state.aiSuggestions[Number(applyButton.dataset.aiApplyIndex)];
      if (!text) {
        return;
      }

      els.message.value = text;
      closeAiModal();
      els.message.focus();
      showToast('추천 문구를 메시지 칸에 입력했습니다.');
    }
  });
}

export async function initGuestbook() {
  cacheElements();

  if (!els.root) {
    return;
  }

  bindEvents();
  closeForm();
  await loadGuestbook();
}
