import { qs, qsa, escapeHtml } from '../utils.js';

const INITIAL_VISIBLE_COUNT = 6;

const galleryState = {
  photos: [],
  expanded: false,
  bound: false
};

function normalizePhotos(photos) {
  if (!Array.isArray(photos)) return [];

  return photos
    .filter((photo) => photo && typeof photo.src === 'string' && photo.src.trim())
    .map((photo, index) => ({
      src: photo.src,
      alt: photo.alt || `웨딩 사진 ${index + 1}`
    }));
}

function ensureGalleryUi() {
  const galleryEl = qs('#gallery');
  if (!galleryEl) return null;

  const sectionEl = galleryEl.closest('.section') || galleryEl.parentElement;
  const titleEl = sectionEl?.querySelector('.section-header h2');

  let countEl = qs('#gallery-count', sectionEl || document);
  if (!countEl && titleEl) {
    countEl = document.createElement('span');
    countEl.id = 'gallery-count';
    countEl.className = 'gallery-count';
    countEl.textContent = '0 photos';
    titleEl.appendChild(document.createTextNode(' '));
    titleEl.appendChild(countEl);
  }

  let moreWrapEl = qs('#gallery-more-wrap', sectionEl || document);
  let moreButtonEl = qs('#gallery-more-btn', sectionEl || document);

  if (!moreWrapEl && sectionEl) {
    moreWrapEl = document.createElement('div');
    moreWrapEl.id = 'gallery-more-wrap';
    moreWrapEl.className = 'gallery-more-wrap';
    moreWrapEl.hidden = true;

    moreButtonEl = document.createElement('button');
    moreButtonEl.type = 'button';
    moreButtonEl.id = 'gallery-more-btn';
    moreButtonEl.className = 'button button-secondary gallery-more-btn';
    moreButtonEl.textContent = '더 불러오기 ▼';

    moreWrapEl.appendChild(moreButtonEl);
    galleryEl.insertAdjacentElement('afterend', moreWrapEl);
  }

  return {
    galleryEl,
    sectionEl,
    countEl,
    moreWrapEl,
    moreButtonEl
  };
}

function getVisiblePhotos() {
  if (galleryState.expanded) {
    return galleryState.photos;
  }

  return galleryState.photos.slice(0, INITIAL_VISIBLE_COUNT);
}

function updateGalleryCount(countEl) {
  if (!countEl) return;
  countEl.textContent = `${galleryState.photos.length} photos`;
}

function updateMoreButton(moreWrapEl, moreButtonEl) {
  if (!moreWrapEl || !moreButtonEl) return;

  const hasMore = galleryState.photos.length > INITIAL_VISIBLE_COUNT;
  moreWrapEl.hidden = !hasMore;

  if (!hasMore) {
    return;
  }

  moreButtonEl.textContent = galleryState.expanded
    ? '접기 ▲'
    : '더 불러오기 ▼';

  moreButtonEl.setAttribute('aria-expanded', String(galleryState.expanded));
}

function renderEmpty(galleryEl, countEl, moreWrapEl) {
  if (galleryEl) {
    galleryEl.innerHTML = `
      <div class="gallery-empty">
        아직 표시할 사진이 없습니다.
      </div>
    `;
  }

  if (countEl) {
    countEl.textContent = '0 photos';
  }

  if (moreWrapEl) {
    moreWrapEl.hidden = true;
  }
}

function renderGallery() {
  const ui = ensureGalleryUi();
  if (!ui) return;

  const { galleryEl, countEl, moreWrapEl, moreButtonEl } = ui;

  updateGalleryCount(countEl);

  if (!galleryState.photos.length) {
    renderEmpty(galleryEl, countEl, moreWrapEl);
    return;
  }

  const visiblePhotos = getVisiblePhotos();

  galleryEl.innerHTML = visiblePhotos
    .map((photo, index) => {
      return `
        <button
          type="button"
          class="gallery-item"
          data-gallery-index="${index}"
          aria-label="${escapeHtml(photo.alt)} 크게 보기"
        >
          <img
            src="${escapeHtml(photo.src)}"
            alt="${escapeHtml(photo.alt)}"
            class="is-loading"
            loading="lazy"
          />
        </button>
      `;
    })
    .join('');

  updateMoreButton(moreWrapEl, moreButtonEl);

  qsa('#gallery img').forEach((image) => {
    const finishLoading = () => image.classList.remove('is-loading');
    if (image.complete) finishLoading();
    image.addEventListener('load', finishLoading, { once: true });
    image.addEventListener('error', finishLoading, { once: true });
  });
}

function openLightbox(index) {
  const photo = getVisiblePhotos()[index];
  if (!photo) return;

  const lightboxEl = qs('#lightbox');
  const lightboxImageEl = qs('#lightbox-image');

  if (!lightboxEl || !lightboxImageEl) return;

  lightboxImageEl.src = photo.src;
  lightboxImageEl.alt = photo.alt;
  lightboxEl.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightboxEl = qs('#lightbox');
  const lightboxImageEl = qs('#lightbox-image');

  if (!lightboxEl || !lightboxImageEl) return;

  lightboxEl.classList.add('hidden');
  lightboxImageEl.src = '';
  lightboxImageEl.alt = '';
  document.body.style.overflow = '';
}

function toggleGalleryExpanded() {
  galleryState.expanded = !galleryState.expanded;
  renderGallery();

  if (!galleryState.expanded) {
    qs('#gallery')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

function bindGalleryEvents() {
  if (galleryState.bound) return;
  galleryState.bound = true;

  document.addEventListener('click', (event) => {
    const galleryItem = event.target.closest('[data-gallery-index]');
    if (galleryItem) {
      const index = Number(galleryItem.dataset.galleryIndex || 0);
      openLightbox(index);
      return;
    }

    const moreButton = event.target.closest('#gallery-more-btn');
    if (moreButton) {
      toggleGalleryExpanded();
      return;
    }

    const closeButton = event.target.closest('#lightbox-close');
    if (closeButton) {
      closeLightbox();
      return;
    }

    const lightboxEl = qs('#lightbox');
    if (lightboxEl && event.target === lightboxEl) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeLightbox();
    }
  });
}

export function initGallery(photos) {
  galleryState.photos = normalizePhotos(photos);
  galleryState.expanded = false;

  bindGalleryEvents();
  renderGallery();
}
