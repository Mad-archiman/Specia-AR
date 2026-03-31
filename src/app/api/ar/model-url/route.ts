import { NextResponse } from 'next/server';
import { getArModelsCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { getPresignedDownloadUrl } from '@/lib/s3';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim();
    if (!code || code.length !== 4) {
      return NextResponse.json({ error: '지정번호 4자리를 입력해 주세요.' }, { status: 400 });
    }

    const origin = new URL(request.url).origin;

    const coll = await getArModelsCollection();
    const doc = await coll.findOne({ code: code.toUpperCase() });
    if (!doc) return NextResponse.json({ error: '해당 지정번호의 모델이 없습니다.' }, { status: 404 });

    if (doc.storage?.provider === 's3' && doc.storage.key) {
      const presigned = await getPresignedDownloadUrl({ key: doc.storage.key });
      return NextResponse.json({ url: presigned.url });
    }

    // GridFS fallback
    if (!doc.fileId) return NextResponse.json({ error: '모델 파일을 찾을 수 없습니다.' }, { status: 404 });
    const fileId = doc.fileId instanceof ObjectId ? doc.fileId : new ObjectId(String(doc.fileId));
    // /api/ar/model은 GridFS를 스트림으로 내려줌. GLTFLoader가 이 URL을 직접 fetch 하게 함.
    // fileId는 여기서 직접 쓰지 않고, code 기반으로 /api/ar/model에서 다시 조회한다.
    void fileId;

    const url = `${origin}/api/ar/model?code=${encodeURIComponent(code.toUpperCase())}`;
    return NextResponse.json({ url });
  } catch (e) {
    console.error('GET ar model-url:', e);
    return NextResponse.json({ error: '모델 URL을 불러올 수 없습니다.' }, { status: 500 });
  }
}

