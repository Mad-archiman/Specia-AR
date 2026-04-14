import { NextResponse } from 'next/server';
import { getArModelsCollection, getArModelsBucket } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

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

    if (doc.fileId) {
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
    }

    if (doc.storage?.provider === 's3' && doc.storage.key && doc.storage.bucket && doc.storage.region) {
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? '';
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? '';
      if (!accessKeyId || !secretAccessKey) {
        return NextResponse.json({ error: '서버 S3 자격증명이 설정되지 않았습니다.' }, { status: 500 });
      }
      const s3 = new S3Client({
        region: doc.storage.region,
        credentials: { accessKeyId, secretAccessKey },
      });
      const res = await s3.send(new GetObjectCommand({ Bucket: doc.storage.bucket, Key: doc.storage.key }));
      if (!res.Body) {
        return NextResponse.json({ error: '모델 파일을 찾을 수 없습니다.' }, { status: 404 });
      }
      const chunks: Buffer[] = [];
      for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': res.ContentType || 'model/gltf-binary',
          'Content-Length': String(buffer.length),
        },
      });
    }
    return NextResponse.json({ error: '모델 파일을 찾을 수 없습니다.' }, { status: 404 });
  } catch (e) {
    console.error('GET ar model:', e);
    return NextResponse.json({ error: '모델을 불러올 수 없습니다.' }, { status: 500 });
  }
}
