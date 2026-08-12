import { supabaseClient } from '../supabaseClient.js';

const CONTACTS_TABLE = 'wedding_contacts';
const ACCOUNTS_TABLE = 'wedding_accounts';
let accordionSequence = 0;

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = text;
  return element;
}

function normalizePhone(phone) {
  return String(phone || '').replace(/[^0-9+]/g, '');
}

function createAccordion(side, title, content) {
  const group = createElement('section', `directory-group directory-group-${side}`);
  const panelId = `directory-panel-${side}-${accordionSequence++}`;
  const toggle = createElement('button', 'directory-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', panelId);
  toggle.append(
    createElement('span', 'directory-toggle-title', title),
    createElement('span', 'directory-toggle-icon', '⌄')
  );

  const panel = createElement('div', 'directory-panel');
  panel.id = panelId;
  panel.hidden = true;
  panel.append(content);
  toggle.addEventListener('click', () => {
    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    toggle.setAttribute('aria-expanded', String(willOpen));
  });
  group.append(toggle, panel);
  return group;
}

function groupBySide(items) {
  return {
    groom: items.filter((item) => item.side === 'groom'),
    bride: items.filter((item) => item.side === 'bride')
  };
}

function createContactCard(contact) {
  const card = createElement('article', 'contact-card');
  const top = createElement('div', 'contact-top');
  const copy = createElement('div');
  copy.append(
    createElement('span', 'contact-role', contact.role_label),
    createElement('strong', 'contact-name', contact.name),
    createElement('p', 'contact-number', contact.phone)
  );
  top.append(copy);

  const phone = normalizePhone(contact.phone);
  const actions = createElement('div', 'contact-actions');
  const call = createElement('a', 'button button-primary button-small', '전화');
  call.href = `tel:${phone}`;
  const message = createElement('a', 'button button-secondary button-small', '문자');
  message.href = `sms:${phone}`;
  const copyButton = createElement('button', 'button button-secondary button-small', '복사');
  copyButton.type = 'button';
  copyButton.dataset.copy = phone;
  actions.append(call, message, copyButton);
  card.append(top, actions);
  return card;
}

function createAccountCard(account) {
  const card = createElement('article', 'account-card');
  const head = createElement('div', 'account-card-head');
  head.append(
    createElement('span', 'account-badge', account.side_label),
    createElement('h3', null, account.account_holder)
  );

  const meta = createElement('dl', 'account-meta');
  [['은행', account.bank_name], ['예금주', account.account_holder], ['계좌번호', account.account_number]]
    .forEach(([label, value]) => {
      const row = createElement('div', 'account-row');
      row.append(createElement('dt', null, label), createElement('dd', null, value));
      meta.append(row);
    });

  const copyButton = createElement('button', 'button button-secondary account-copy-btn', '계좌 복사');
  copyButton.type = 'button';
  copyButton.dataset.copy = `${account.bank_name} ${account.account_number} ${account.account_holder}`;
  card.append(head, meta, copyButton);
  return card;
}

function renderGrouped(list, items, titleSuffix, createCard) {
  if (!list || !items.length) return;
  const groups = groupBySide(items);
  list.replaceChildren();
  [['groom', '신랑측'], ['bride', '신부측']].forEach(([side, label]) => {
    if (!groups[side].length) return;
    const cards = createElement('div', 'directory-card-list');
    groups[side].forEach((item) => cards.append(createCard(item)));
    list.append(createAccordion(side, `${label} ${titleSuffix}`, cards));
  });
}

function renderContacts(contacts) {
  renderGrouped(document.getElementById('contact-list'), contacts, '연락처', createContactCard);
}

function renderAccounts(accounts) {
  renderGrouped(document.getElementById('account-list'), accounts, '계좌', createAccountCard);
}

async function loadDirectory() {
  if (!supabaseClient) return;
  const [contactsResult, accountsResult] = await Promise.all([
    supabaseClient.from(CONTACTS_TABLE)
      .select('side, role_label, name, phone, display_order')
      .eq('is_visible', true).order('display_order'),
    supabaseClient.from(ACCOUNTS_TABLE)
      .select('side, side_label, bank_name, account_holder, account_number, display_order')
      .eq('is_visible', true).order('display_order')
  ]);
  if (contactsResult.error) console.warn('[directory] contacts load failed', contactsResult.error);
  else renderContacts(contactsResult.data || []);
  if (accountsResult.error) console.warn('[directory] accounts load failed', accountsResult.error);
  else renderAccounts(accountsResult.data || []);
}

export async function initDirectory() {
  try {
    await loadDirectory();
  } catch (error) {
    console.warn('[directory] load failed', error);
  }
}
