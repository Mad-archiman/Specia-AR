'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GuideContent } from '@/components/GuideContent';

export default function MainPage() {
  const router = useRouter();
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 4) {
      setError('지정번호 4자리를 입력해 주세요.');
      return;
    }
    setError('');
    router.push(`/ar?code=${encodeURIComponent(trimmed)}`);
  };

  return (
    <main
      className="relative flex min-h-full flex-1 flex-col items-center justify-center px-4 py-8"
      style={{
        background: 'linear-gradient(180deg, #281e5a 0%, #50288c 100%)',
      }}
    >
      <div className="absolute right-4 top-4 z-10 flex flex-col items-end">
        <button
          type="button"
          onClick={() => setGuideOpen((o) => !o)}
          className="rounded border border-white bg-black/10 px-4 py-2 text-sm text-white opacity-50 outline-none transition-opacity hover:opacity-100"
          aria-expanded={guideOpen}
        >
          설명서
        </button>
        {guideOpen && (
          <div className="mt-2 w-full max-w-[320px]">
            <GuideContent variant="main" />
          </div>
        )}
      </div>
      <h1 className="text-center text-white font-bold" style={{ fontSize: 'clamp(2.5rem, 10vw, 4rem)' }}>
        SP<span style={{ color: '#8C90EE' }}>E</span>CIA-AR
      </h1>
      <p className="mt-6 text-center text-white" style={{ fontSize: 'clamp(1.125rem, 4vw, 1.5rem)' }}>
        SP<span style={{ color: '#8C90EE' }}>E</span>CIA-AR에 오신 것을 환영합니다.
      </p>
      <p className="mt-3 text-center text-white" style={{ fontSize: 'clamp(0.875rem, 3vw, 1rem)' }}>
        당신의 프로젝트를 현실에 옮겨보세요.
      </p>
      <button
        type="button"
        onClick={() => { setCodeModalOpen(true); setCode(''); setError(''); }}
        className="mt-12 min-h-[44px] min-w-[44px] cursor-pointer touch-manipulation rounded-md px-8 py-3 text-base font-normal text-white transition-opacity hover:opacity-90 active:opacity-100"
        style={{ backgroundColor: '#3c2896', touchAction: 'manipulation' }}
      >
        AR 3D 뷰어
      </button>

      {codeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setCodeModalOpen(false)}>
          <div className="w-full max-w-sm rounded-lg bg-[#1a1a1a] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-lg font-medium text-white">지정번호 입력</h3>
            <p className="mb-4 text-sm text-white/70">공유받은 4자리 지정번호를 입력하세요.</p>
            {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
            <form onSubmit={handleSubmitCode} className="space-y-4">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="예: A1B2"
                maxLength={4}
                className="w-full rounded border border-white/20 bg-white/5 px-4 py-3 text-center text-lg font-mono tracking-widest text-white outline-none focus:border-white/50"
                autoFocus
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setCodeModalOpen(false)} className="min-h-[44px] flex-1 cursor-pointer touch-manipulation rounded bg-white/10 py-2 text-white hover:bg-white/20" style={{ touchAction: 'manipulation' }}>취소</button>
                <button type="submit" disabled={loading} className="min-h-[44px] flex-1 cursor-pointer touch-manipulation rounded bg-[#3c2896] py-2 text-white hover:bg-[#50288c] disabled:pointer-events-none disabled:opacity-50" style={{ touchAction: 'manipulation' }}>확인</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
