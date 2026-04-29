import { qs } from '../utils.js';

export function initIntroParallax() {
  const stage = qs('#intro-stage');
  const media = qs('#intro-media');
  const copy = qs('#intro-copy');
  if (!stage || !media || !copy) return;

  let ticking = false;

  const update = () => {
    const rect = stage.getBoundingClientRect();
    const total = stage.offsetHeight - window.innerHeight;
    const progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;

    const mediaTranslate = progress * 18;
    const mediaScale = 1.06 - progress * 0.04;
    const copyTranslate = progress * 48;
    const copyOpacity = 1 - progress * 0.85;

    media.style.transform = `translate3d(0, ${mediaTranslate}px, 0) scale(${mediaScale})`;
    copy.style.transform = `translate3d(0, ${copyTranslate}px, 0)`;
    copy.style.opacity = String(Math.max(copyOpacity, 0));
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  };

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
}
