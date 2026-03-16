'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { FullscreenButton } from './FullscreenButton';
import { AuthModal } from './AuthModal';

interface AuthUser {
  userId: string;
  userType: 'user' | 'admin';
}

export function Navbar() {
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => setDropdownOpen(false), 500);
  };

  const handleMouseEnter = () => {
    clearCloseTimeout();
    setDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    scheduleClose();
  };

  const fetchSession = useCallback(async () => {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    const data = await res.json();
    setUser(data.user ?? null);
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleLogout = async () => {
    clearCloseTimeout();
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    setDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        clearCloseTimeout();
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      clearCloseTimeout();
    };
  }, []);

  return (
    <>
      <header className="relative z-50 flex h-[7vh] min-h-[48px] shrink-0 items-center justify-between bg-[#1a1a1a] px-5">
        <Link
          href="/"
          className="text-lg font-medium text-white transition-opacity hover:opacity-90"
          style={{ fontSize: '18px' }}
        >
          SP<span style={{ color: '#8C90EE' }}>E</span>CIA-AR
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <div
              ref={dropdownRef}
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="text-sm font-medium text-white transition-opacity hover:opacity-90"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                {user.userId}님 환영합니다
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 min-w-[140px] rounded border border-white/20 bg-[#1a1a1a] py-2 shadow-lg">
                  <Link
                    href="/admin"
                    className="block px-4 py-2 text-left text-sm text-white transition hover:bg-white/10"
                    onClick={() => setDropdownOpen(false)}
                  >
                    관리자 페이지
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm text-white transition hover:bg-white/10"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="hidden text-sm font-medium text-white transition-opacity hover:opacity-90 md:block"
            >
              관리자로그인
            </button>
          )}
          <FullscreenButton />
        </div>
      </header>
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthChange={fetchSession}
      />
    </>
  );
}
