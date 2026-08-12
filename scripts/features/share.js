import { APP_CONFIG } from '../../config.js';
import { copyText, showToast } from '../utils.js';

function getShareUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

function getImageUrl() {
  return new URL(APP_CONFIG.share?.imagePath || './assets/photos/main_logo.png', window.location.href).href;
}

function initKakao() {
  const kakao = window.Kakao;
  const key = APP_CONFIG.share?.kakaoJavaScriptKey?.trim();
  if (!kakao || !key) return null;
  if (!kakao.isInitialized()) kakao.init(key);
  return kakao;
}

function initKakaoShare() {
  const button = document.getElementById('share-kakao-btn');
  if (!button) return;

  button.addEventListener('click', () => {
    const kakao = initKakao();
    if (!kakao) {
      showToast('카카오 공유 설정 후 이용할 수 있습니다.');
      return;
    }

    const url = getShareUrl();
    try {
      kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: APP_CONFIG.share?.title || '모바일 청첩장',
          description: APP_CONFIG.share?.description || '',
          imageUrl: getImageUrl(),
          link: { mobileWebUrl: url, webUrl: url }
        },
        buttons: [{ title: '청첩장 보기', link: { mobileWebUrl: url, webUrl: url } }]
      });
    } catch (error) {
      console.error('[share] Kakao share failed', error);
      showToast('카카오톡 공유를 열지 못했습니다.');
    }
  });
}

function initLinkCopy() {
  const button = document.getElementById('share-copy-link-btn');
  if (!button) return;
  button.addEventListener('click', () => copyText(getShareUrl()));
}

export function initShare() {
  initKakaoShare();
  initLinkCopy();
}
