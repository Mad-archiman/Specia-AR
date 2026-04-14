import { NextResponse } from 'next/server';
import { getArModelsCollection } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim();
    if (!code || code.length !== 4) {
      return NextResponse.json({ error: '지정번호 4자리를 입력해 주세요.' }, { status: 400 });
    }

    const coll = await getArModelsCollection();
    const doc = await coll.findOne({ code: code.toUpperCase() });
    if (!doc) return NextResponse.json({ error: '해당 지정번호의 모델이 없습니다.' }, { status: 404 });

    if (doc.storage?.provider !== 's3' && !doc.fileId) {
      return NextResponse.json({ error: '모델 파일을 찾을 수 없습니다.' }, { status: 404 });
    }
    // 웹/모바일 브라우저에서 S3 CORS 영향을 받지 않도록 항상 서버 프록시 URL을 제공합니다.
    const url = `/api/ar/model?code=${encodeURIComponent(code.toUpperCase())}`;
    return NextResponse.json({ url });
  } catch (e) {
    console.error('GET ar model-url:', e);
    return NextResponse.json({ error: '모델 URL을 불러올 수 없습니다.' }, { status: 500 });
  }
}

