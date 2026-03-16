import { NextResponse } from 'next/server';
import { getArModelsCollection, getArModelsBucket } from '@/lib/db';
import { ObjectId } from 'mongodb';

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
    if (!doc) {
      return NextResponse.json({ error: '해당 지정번호의 모델이 없습니다.' }, { status: 404 });
    }

    const bucket = await getArModelsBucket();
    const fileId = doc.fileId instanceof ObjectId ? doc.fileId : new ObjectId(String(doc.fileId));
    const cursor = bucket.find({ _id: fileId });
    const file = await cursor.next();
    if (!file) {
      return NextResponse.json({ error: '모델 파일을 찾을 수 없습니다.' }, { status: 404 });
    }

    const downloadStream = bucket.openDownloadStream(fileId);
    const chunks: Buffer[] = [];
    for await (const chunk of downloadStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Content-Length': String(buffer.length),
      },
    });
  } catch (e) {
    console.error('GET ar model:', e);
    return NextResponse.json({ error: '모델을 불러올 수 없습니다.' }, { status: 500 });
  }
}
