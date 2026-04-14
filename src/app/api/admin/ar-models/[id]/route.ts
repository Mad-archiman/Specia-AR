import { NextResponse } from 'next/server';
import { getArModelsCollection, getArModelsBucket } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { deleteS3Object, deleteS3ObjectAt, normalizeS3Key } from '@/lib/s3';

export const runtime = 'nodejs';

function isNonBlockingS3DeleteError(error: unknown): boolean {
  const code = typeof error === 'object' && error !== null && 'Code' in error
    ? String((error as { Code?: unknown }).Code)
    : '';
  return code === 'InvalidAccessKeyId' || code === 'AccessDenied' || code === 'SignatureDoesNotMatch';
}

async function deleteS3BestEffort(doc: {
  storage?: { provider?: string; key?: string; bucket?: string; region?: string };
}): Promise<{ warning?: string }> {
  if (doc.storage?.provider !== 's3' || !doc.storage.key) return {};
  try {
    if (doc.storage.bucket && doc.storage.region) {
      await deleteS3ObjectAt({
        key: doc.storage.key,
        bucket: doc.storage.bucket,
        region: doc.storage.region,
        normalizeKey: false,
      });
    } else {
      await deleteS3Object(doc.storage.key);
    }
    return {};
  } catch (error) {
    if (isNonBlockingS3DeleteError(error)) {
      console.warn('S3 삭제 스킵(권한/키 불일치):', error);
      return { warning: 'S3 원본 파일 삭제 권한이 없어 DB 레코드만 삭제/갱신했습니다.' };
    }
    throw error;
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 });
    }
    const contentTypeHeader = request.headers.get('content-type') ?? '';
    const coll = await getArModelsCollection();
    const doc = await coll.findOne({ _id: new ObjectId(id) });
    if (!doc) return NextResponse.json({ error: '모델을 찾을 수 없습니다.' }, { status: 404 });

    // JSON path: S3 presigned 업로드 + metadata update
    if (contentTypeHeader.includes('application/json')) {
      const body = (await request.json()) as {
        name?: string | null;
        lat?: string | number | null;
        lon?: string | number | null;
        alt?: string | number | null;
        s3Key?: string;
      };

      const name = typeof body.name === 'string' ? body.name.trim() : null;
      const latStr = body.lat != null ? String(body.lat) : null;
      const lonStr = body.lon != null ? String(body.lon) : null;
      const altStr = body.alt != null ? String(body.alt) : null;

      let geoLocation: { lat: number; lon: number; alt?: number } | undefined;
      const geoLat = latStr != null && latStr.trim() !== '' ? parseFloat(latStr) : NaN;
      const geoLon = lonStr != null && lonStr.trim() !== '' ? parseFloat(lonStr) : NaN;
      if (!Number.isNaN(geoLat) && !Number.isNaN(geoLon) && geoLat >= -90 && geoLat <= 90 && geoLon >= -180 && geoLon <= 180) {
        const alt = altStr != null && altStr.trim() !== '' ? parseFloat(altStr) : undefined;
        geoLocation = { lat: geoLat, lon: geoLon, ...(alt != null && !Number.isNaN(alt) && { alt }) };
      }
      const clearGeo = latStr !== null && lonStr !== null && (latStr.trim() === '' || lonStr.trim() === '');

      const s3KeyRaw = typeof body.s3Key === 'string' ? body.s3Key : null;
      const s3Key = s3KeyRaw && s3KeyRaw.trim() !== '' ? normalizeS3Key(s3KeyRaw) : null;

      if (s3Key) {
        // 기존 스토리지 정리: S3면 기존 객체 삭제, GridFS면 파일 삭제
        const s3DeleteResult = await deleteS3BestEffort(doc);
        if (doc.fileId) {
          const bucket = await getArModelsBucket();
          const fileId = doc.fileId instanceof ObjectId ? doc.fileId : new ObjectId(String(doc.fileId));
          await bucket.delete(fileId);
        }
      }

      const set: Record<string, unknown> = {};
      const unset: Record<string, 1> = {};
      let s3DeleteResult: { warning?: string } = {};

      if (name != null) set.name = name;
      if (geoLocation != null && !clearGeo) set.geoLocation = geoLocation;
      if (clearGeo) unset.geoLocation = 1;

      if (s3Key) {
        const bucket = process.env.S3_BUCKET ?? '';
        const region = process.env.AWS_REGION ?? '';
        if (!bucket || !region) {
          return NextResponse.json({ error: '서버 설정이 완료되지 않았습니다.' }, { status: 500 });
        }
        set.storage = { provider: 's3', bucket, region, key: s3Key };
        unset.fileId = 1;
      }

      const update: Record<string, unknown> = {};
      if (Object.keys(set).length > 0) update.$set = set;
      if (Object.keys(unset).length > 0) update.$unset = unset;

      if (Object.keys(update).length === 0) {
        return NextResponse.json({ success: true });
      }

      await coll.updateOne({ _id: new ObjectId(id) }, update);
      return NextResponse.json({ success: true, ...(s3DeleteResult.warning ? { warning: s3DeleteResult.warning } : {}) });
    }

    // Legacy formData path (GridFS replace). Large files still may fail (413).
    const formData = await request.formData();
    const name = (formData.get('name') as string)?.trim() ?? null;
    const file = formData.get('file') as File | null;
    const latStr = formData.get('lat') as string | null;
    const lonStr = formData.get('lon') as string | null;
    const altStr = formData.get('alt') as string | null;

    let geoLocation: { lat: number; lon: number; alt?: number } | undefined;
    const geoLat = latStr != null && latStr.trim() !== '' ? parseFloat(latStr) : NaN;
    const geoLon = lonStr != null && lonStr.trim() !== '' ? parseFloat(lonStr) : NaN;
    if (!Number.isNaN(geoLat) && !Number.isNaN(geoLon) && geoLat >= -90 && geoLat <= 90 && geoLon >= -180 && geoLon <= 180) {
      const alt = altStr != null && altStr.trim() !== '' ? parseFloat(altStr) : undefined;
      geoLocation = { lat: geoLat, lon: geoLon, ...(alt != null && !Number.isNaN(alt) && { alt }) };
    }
    const clearGeo = latStr !== null && lonStr !== null && (latStr.trim() === '' || lonStr.trim() === '');

    if (file && file instanceof File && file.size > 0 && file.name.toLowerCase().endsWith('.glb')) {
      const bucket = await getArModelsBucket();
      if (doc.fileId) {
        const fileId = doc.fileId instanceof ObjectId ? doc.fileId : new ObjectId(String(doc.fileId));
        await bucket.delete(fileId);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const newId = new ObjectId();
      const uploadStream = bucket.openUploadStreamWithId(newId, file.name, {
        metadata: { contentType: 'model/gltf-binary' },
      });
      await new Promise<void>((resolve, reject) => {
        uploadStream.on('finish', () => resolve());
        uploadStream.on('error', reject);
        uploadStream.end(buffer);
      });

      const set: Record<string, unknown> = { fileId: newId };
      if (name != null) set.name = name;
      if (geoLocation != null && !clearGeo) set.geoLocation = geoLocation;
      const unset: Record<string, 1> = { storage: 1 };
      if (clearGeo) unset.geoLocation = 1;
      await coll.updateOne(
        { _id: new ObjectId(id) },
        { $set: set, $unset: unset }
      );
    } else {
      const set: Record<string, unknown> = {};
      if (name != null) set.name = name;
      if (geoLocation != null && !clearGeo) set.geoLocation = geoLocation;
      if (Object.keys(set).length > 0) await coll.updateOne({ _id: new ObjectId(id) }, { $set: set });
      if (clearGeo) await coll.updateOne({ _id: new ObjectId(id) }, { $unset: { geoLocation: 1 } });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('PUT ar-model:', e);
    return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 });
    }
    const coll = await getArModelsCollection();
    const doc = await coll.findOne({ _id: new ObjectId(id) });
    if (!doc) return NextResponse.json({ error: '모델을 찾을 수 없습니다.' }, { status: 404 });

    const s3DeleteResult = await deleteS3BestEffort(doc);
    if (doc.fileId) {
      const bucket = await getArModelsBucket();
      const fileId = doc.fileId instanceof ObjectId ? doc.fileId : new ObjectId(String(doc.fileId));
      await bucket.delete(fileId);
    }
    await coll.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true, ...(s3DeleteResult.warning ? { warning: s3DeleteResult.warning } : {}) });
  } catch (e) {
    console.error('DELETE ar-model:', e);
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
  }
}
