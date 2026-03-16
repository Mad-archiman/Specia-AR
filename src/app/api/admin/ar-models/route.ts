import { NextResponse } from 'next/server';
import { getArModelsCollection, getArModelsBucket } from '@/lib/db';
import { generateAlphanumericCode } from '@/lib/code';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

const CODE_LENGTH = 4;

export async function GET() {
  try {
    const coll = await getArModelsCollection();
    const list = await coll.find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({
      items: list.map((d) => ({
        _id: String(d._id),
        code: d.code,
        name: d.name ?? '',
        geoLocation: d.geoLocation ?? null,
        createdAt: d.createdAt,
      })),
    });
  } catch (e) {
    console.error('GET ar-models:', e);
    return NextResponse.json({ error: '목록을 불러올 수 없습니다.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = (formData.get('name') as string)?.trim() ?? '';

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'GLB 파일을 선택해 주세요.' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.glb')) {
      return NextResponse.json({ error: '.glb 파일만 업로드할 수 있습니다.' }, { status: 400 });
    }

    const coll = await getArModelsCollection();
    const bucket = await getArModelsBucket();

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const id = new ObjectId();
    const uploadStream = bucket.openUploadStreamWithId(id, file.name, {
      metadata: { contentType: 'model/gltf-binary' },
    });
    await new Promise<void>((resolve, reject) => {
      uploadStream.on('finish', () => resolve());
      uploadStream.on('error', reject);
      uploadStream.end(buffer);
    });

    await coll.insertOne({
      code,
      fileId: id,
      name: name || file.name,
      createdAt: new Date(),
    });

    return NextResponse.json({ code, name: name || file.name });
  } catch (e) {
    console.error('POST ar-model:', e);
    return NextResponse.json({ error: '업로드에 실패했습니다.' }, { status: 500 });
  }
}
