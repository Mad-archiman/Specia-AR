import { NextResponse } from 'next/server';
import { getAuthCookieName } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(getAuthCookieName(), '', { maxAge: 0, path: '/' });
  return res;
}
