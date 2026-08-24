const VENUE = {
  name: '농심컨벤션웨딩홀',
  address: '서울 동작구 여의대방로 112',
  lat: 37.4965688,
  lng: 126.9187584
};

function showToast(message) {
  const toast = document.getElementById('toast');

  if (!toast) {
    console.warn(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add('is-visible');

  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 2200);
}

function openInNewTab(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function isMobileDevice() {
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  return /android|iphone|ipad|ipod|mobile/i.test(ua);
}

function buildGoogleDirectionsUrl() {
  return `https://www.google.com/maps/dir/?api=1&destination=${VENUE.lat},${VENUE.lng}&travelmode=driving`;
}

function buildNaverWebUrl() {
  return `https://map.naver.com/p/search/${encodeURIComponent(VENUE.name)}`;
}

function buildKakaoWebUrl() {
  return `https://map.kakao.com/link/to/${encodeURIComponent(VENUE.name)},${VENUE.lat},${VENUE.lng}`;
}

/**
 * 참고:
 * - T map은 브라우저 환경에서 서비스/OS 조합별 딥링크 동작 차이가 큼
 * - 모바일에선 앱 스킴 시도
 * - 실패 시 티맵 홈페이지로 fallback
 */
function buildTmapSchemeUrl() {
  return `tmap://route?goalname=${encodeURIComponent(VENUE.name)}&goalx=${VENUE.lng}&goaly=${VENUE.lat}`;
}

function buildTmapWebFallbackUrl() {
  return 'https://www.tmap.co.kr/';
}

function tryOpenScheme(schemeUrl, fallbackUrl, fallbackMessage = '') {
  const startedAt = Date.now();
  let pageHidden = false;

  const onVisibilityChange = () => {
    if (document.hidden) {
      pageHidden = true;
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange, { once: true });

  const timer = window.setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);

    // 페이지가 숨겨지지 않았다면 앱 실행 실패로 보고 fallback
    if (!pageHidden && Date.now() - startedAt < 1800) {
      if (fallbackMessage) {
        showToast(fallbackMessage);
      }
      openInNewTab(fallbackUrl);
    }
  }, 1400);

  try {
    window.location.href = schemeUrl;
  } catch (error) {
    console.error('[maps] failed to open scheme', error);
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibilityChange);

    if (fallbackMessage) {
      showToast(fallbackMessage);
    }
    openInNewTab(fallbackUrl);
  }
}

function bindGoogleButton() {
  const button = document.getElementById('nav-google');
  if (!button) return;

  button.addEventListener('click', () => {
    openInNewTab(buildGoogleDirectionsUrl());
  });
}

function bindNaverButton() {
  const button = document.getElementById('nav-naver');
  if (!button) return;

  button.addEventListener('click', () => {
    // 웹 URL 기반으로 안정 동작
    openInNewTab(buildNaverWebUrl());
  });
}

function bindKakaoButton() {
  const button = document.getElementById('nav-kakao');
  if (!button) return;

  button.addEventListener('click', () => {
    // 데스크톱/모바일 모두 카카오맵 링크 URL 우선
    openInNewTab(buildKakaoWebUrl());
  });
}

function bindTmapButton() {
  const button = document.getElementById('nav-tmap');
  if (!button) return;

  button.addEventListener('click', () => {
    const schemeUrl = buildTmapSchemeUrl();
    const fallbackUrl = buildTmapWebFallbackUrl();

    if (isMobileDevice()) {
      tryOpenScheme(
        schemeUrl,
        fallbackUrl,
        '티맵 앱을 열지 못해 웹페이지로 이동합니다.'
      );
      return;
    }

    // 데스크톱에선 앱 스킴 시도 후 실패 시 티맵 홈페이지 fallback
    tryOpenScheme(
      schemeUrl,
      fallbackUrl,
      '데스크톱에서는 티맵 앱 연결이 제한될 수 있어 티맵 웹으로 이동합니다.'
    );
  });
}

export function initMaps() {
  bindGoogleButton();
  bindNaverButton();
  bindKakaoButton();
  bindTmapButton();
}
