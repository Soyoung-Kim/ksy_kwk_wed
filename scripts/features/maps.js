import { APP_CONFIG } from '../config.js';
import { qs } from '../utils.js';

function openAppOrFallback(appUrl, fallbackUrl) {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (!isMobile) {
    window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  const start = Date.now();
  window.location.href = appUrl;

  setTimeout(() => {
    if (Date.now() - start < 1400) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    }
  }, 900);
}

export function initMaps() {
  const { name, lat, lng } = APP_CONFIG.venue;

  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const kakaoUrl = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
  const tmapScheme = `tmap://route?goalname=${encodeURIComponent(name)}&goalx=${lng}&goaly=${lat}`;
  const naverScheme = `nmap://route/car?dname=${encodeURIComponent(name)}&dlat=${lat}&dlng=${lng}`;

  qs('#nav-google')?.addEventListener('click', () => {
    window.open(googleUrl, '_blank', 'noopener,noreferrer');
  });

  qs('#nav-kakao')?.addEventListener('click', () => {
    openAppOrFallback(kakaoUrl, googleUrl);
  });

  qs('#nav-tmap')?.addEventListener('click', () => {
    openAppOrFallback(tmapScheme, googleUrl);
  });

  qs('#nav-naver')?.addEventListener('click', () => {
    openAppOrFallback(naverScheme, googleUrl);
  });
}
