'use client';

import { useState, useEffect, useCallback } from 'react';

type UserType = 'user' | 'admin';

interface AuthUser {
  userId: string;
  userType: UserType;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthChange?: () => void;
}

export function AuthModal({ isOpen, onClose, onAuthChange }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const fetchSession = useCallback(async () => {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    const data = await res.json();
    setUser(data.user ?? null);
  }, []);

  useEffect(() => {
    if (isOpen) fetchSession();
  }, [isOpen, fetchSession]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: id.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '로그인에 실패했습니다.');
        return;
      }
      setUser({ userId: id.trim().toLowerCase(), userType: data.userType });
      setId('');
      setPassword('');
      onAuthChange?.();
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail ? ` (${data.detail})` : '';
        setError((data.error ?? '회원가입에 실패했습니다.') + detail);
        return;
      }
      setError('');
      setTab('login');
      setPassword('');
      alert(data.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    setId('');
    setPassword('');
    setError('');
    onAuthChange?.();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="관리자 로그인"
    >
      <div
        className="w-full max-w-sm rounded-lg bg-[#1a1a1a] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">관리자 로그인</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {user ? (
          <div className="space-y-4">
            <p className="text-sm text-white/90">
              <span className="font-medium">{user.userId}</span>
              <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-xs">
                {user.userType === 'admin' ? '관리자' : '일반'}
              </span>
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded border border-white/30 bg-white/10 py-2 text-sm text-white transition hover:bg-white/20"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex rounded bg-white/10 p-1">
              <button
                type="button"
                onClick={() => { setTab('login'); setError(''); }}
                className={`flex-1 rounded py-2 text-sm font-medium transition ${tab === 'login' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'}`}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => { setTab('signup'); setError(''); }}
                className={`flex-1 rounded py-2 text-sm font-medium transition ${tab === 'signup' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'}`}
              >
                회원가입
              </button>
            </div>

            {error && (
              <p className="mb-3 text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <form
              onSubmit={tab === 'login' ? handleLogin : handleSignup}
              className="space-y-4"
            >
              <div>
                <label htmlFor="auth-id" className="mb-1 block text-xs text-white/70">
                  ID
                </label>
                <input
                  id="auth-id"
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-white/50"
                  placeholder="아이디"
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label htmlFor="auth-pw" className="mb-1 block text-xs text-white/70">
                  비밀번호
                </label>
                <input
                  id="auth-pw"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-white/50"
                  placeholder="비밀번호"
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-[#3c2896] py-2 text-sm font-medium text-white transition hover:bg-[#50288c] disabled:opacity-50"
              >
                {loading ? '처리 중…' : tab === 'login' ? '로그인' : '회원가입'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
