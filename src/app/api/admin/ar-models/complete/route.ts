import { NextResponse } from 'next/server';
import { getArModelsCollection } from '@/lib/db';
import { generateAlphanumericCode } from '@/lib/code';
import { getDefaultS3Prefix } from '@/lib/s3';

export const runtime = 'nodejs';

const CODE_LENGTH = 4;

function isValidS3Key(key: unknown, prefix: string): key is string {
  if (typeof key !== 'string') return false;
  const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
  return key.startsWith(normalizedPrefix) && key.toLowerCase().endsWith('.glb');
}

export async function POST(request: Request) {
  try {
    const contentTypeHeader = request.headers.get('content-type') ?? '';
    if (!contentTypeHeader.includes('application/json')) {
      return NextResponse.json({ error: 'JSON 형식으로 요청해 주세요.' }, { status: 400 });
    }

    const body = (await request.json()) as {
      key?: string;
      name?: string;
      originalFileName?: string;
    };

    const prefix = getDefaultS3Prefix();
    const s3Key = isValidS3Key(body.key, prefix) ? body.key : null;

    if (!s3Key) {
      return NextResponse.json({ error: '업로드된 파일 키가 올바르지 않습니다.' }, { status: 400 });
    }

    const coll = await getArModelsCollection();

    let code: string | null = null;
    for (let i = 0; i < 20; i++) {
      const candidate = generateAlphanumericCode(CODE_LENGTH).toUpperCase();
      const existing = await coll.findOne({ code: candidate });
      if (!existing) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      return NextResponse.json({ error: '코드 생성에 실패했습니다. 다시 시도해 주세요.' }, { status: 500 });
    }

    const bucket = process.env.S3_BUCKET ?? '';
    const region = process.env.AWS_REGION ?? '';
    if (!bucket || !region) {
      return NextResponse.json({ error: '서버 설정이 완료되지 않았습니다.' }, { status: 500 });
    }

    await coll.insertOne({
      code,
      // 기존 GridFS와 구분하기 위해 fileId 대신 storage 필드를 사용
      storage: {
        provider: 's3',
        bucket,
        region,
        key: s3Key,
      },
      name: (body.name?.trim() ?? '') || (body.originalFileName?.trim() ?? 'model.glb'),
      createdAt: new Date(),
    });

    return NextResponse.json({
      code,
      name: (body.name?.trim() ?? '') || (body.originalFileName?.trim() ?? 'model.glb'),
    });
  } catch (e) {
    console.error('POST ar-model complete:', e);
    return NextResponse.json({ error: '업로드 완료 처리에 실패했습니다.' }, { status: 500 });
  }
}

