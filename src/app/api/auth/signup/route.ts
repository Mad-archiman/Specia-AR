import { NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export const runtime = 'nodejs';

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
    if (userId.length < 2) {
      return NextResponse.json({ error: 'ID는 2자 이상이어야 합니다.' }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ error: '비밀번호는 4자 이상이어야 합니다.' }, { status: 400 });
    }

    const users = await getUsersCollection();
    const existing = await users.findOne({ userId });
    if (existing) {
      return NextResponse.json({ error: '이미 사용 중인 ID입니다.' }, { status: 409 });
    }

    const hashed = await hashPassword(password);
    await users.insertOne({
      userId,
      password: hashed,
      userType: 'user',
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, message: '회원가입이 완료되었습니다.' });
  } catch (e) {
    const message = e instanceof Error ? e.message : '알 수 없는 오류';
    console.error('Signup error:', e);
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: '회원가입 처리 중 오류가 발생했습니다.',
        ...(isDev && { detail: message }),
      },
      { status: 500 }
    );
  }
}
