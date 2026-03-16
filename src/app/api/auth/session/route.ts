import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, getAuthCookieName } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getAuthCookieName())?.value;
    if (!token) {
      return NextResponse.json({ user: null });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: { userId: payload.userId, userType: payload.userType },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
