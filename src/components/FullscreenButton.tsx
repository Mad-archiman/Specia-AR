'use client';

import { useState, useCallback } from 'react';

export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;

    const showFallback = () => {
      const msg =
        '이 브라우저에서는 전체화면이 제한될 수 있습니다.\n\n주소창 없이 사용하려면:\n• Android: 메뉴 → "홈 화면에 추가"\n• iOS: 공유 → "홈 화면에 추가"';
      alert(msg);
    };

    try {
      if (!document.fullscreenElement) {
        const el = document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> };
        if (!el.requestFullscreen) {
          showFallback();
          return;
        }
        el.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(showFallback);
      } else {
        const doc = document as Document & { exitFullscreen?: () => Promise<void> };
        if (doc.exitFullscreen) {
          doc.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
      }
    } catch {
      showFallback();
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      className="min-h-[44px] min-w-[44px] cursor-pointer touch-manipulation rounded px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-100"
      style={{ touchAction: 'manipulation' }}
      aria-label={isFullscreen ? '전체화면 해제' : '전체화면'}
    >
      {isFullscreen ? '전체화면 해제' : '전체화면'}
    </button>
  );
}
