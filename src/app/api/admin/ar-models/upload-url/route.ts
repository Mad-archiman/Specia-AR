import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPresignedUploadUrl } from '@/lib/s3';

export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB 목표

export async function POST(request: Request) {
  try {
    const contentTypeHeader = request.headers.get('content-type') ?? '';
    if (!contentTypeHeader.includes('application/json')) {
      return NextResponse.json({ error: 'JSON 형식으로 요청해 주세요.' }, { status: 400 });
    }

    const body = (await request.json()) as {
      fileName?: string;
      size?: number;
    };

    const fileName = typeof body.fileName === 'string' ? body.fileName : '';
    // Presigned URL 서명 안정성을 위해 Content-Type은 고정합니다.
    const contentType = 'model/gltf-binary';
    const size = typeof body.size === 'number' ? body.size : Number(body.size);

    if (!fileName.toLowerCase().endsWith('.glb')) {
      return NextResponse.json({ error: '.glb 파일만 업로드할 수 있습니다.' }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: '파일 크기를 확인할 수 없습니다.' }, { status: 400 });
    }
    if (size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `업로드 파일이 너무 큽니다. 최대 ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB` }, { status: 413 });
    }

    // 파일은 S3에 직접 업로드하므로, 서버는 실제 바이너리를 받지 않습니다.
    const objectKey = `${crypto.randomUUID()}.glb`;
    const presigned = await getPresignedUploadUrl({
      key: objectKey,
      contentType,
      expiresInSeconds: 600,
    });

    return NextResponse.json({
      uploadUrl: presigned.uploadUrl,
      key: presigned.key,
      expiresInSeconds: presigned.expiresInSeconds,
      contentType,
    });
  } catch (e) {
    console.error('POST ar-model upload-url:', e);
    const message = e instanceof Error ? e.message : '업로드 URL 생성에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

