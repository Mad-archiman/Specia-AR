import { NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/db';
import { verifyPassword, createToken, getAuthCookieName, getAuthCookieMaxAge } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, password } = body as { id?: string; password?: string };

    if (!id || typeof id !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'ID와 비밀번호를 입력해 주세요.' },
        { status: 400 }
      );
    }

    const userId = id.trim().toLowerCase();
    const users = await getUsersCollection();
    const user = await users.findOne({ userId });
    if (!user) {
      return NextResponse.json({ error: 'ID 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'ID 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    const token = await createToken({
      userId: user.userId,
      userType: user.userType,
    });

    const cookieName = getAuthCookieName();
    const maxAge = getAuthCookieMaxAge();
    const res = NextResponse.json({
      success: true,
      userType: user.userType,
      message: '로그인되었습니다.',
    });
    res.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });
    return res;
  } catch (e) {
    console.error('Login error:', e);
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
