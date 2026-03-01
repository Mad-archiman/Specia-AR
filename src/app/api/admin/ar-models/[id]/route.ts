import { NextResponse } from 'next/server';
import { getArModelsCollection, getArModelsBucket } from '@/lib/db';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 });
    }
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

    const coll = await getArModelsCollection();
    const doc = await coll.findOne({ _id: new ObjectId(id) });
    if (!doc) return NextResponse.json({ error: '모델을 찾을 수 없습니다.' }, { status: 404 });

    const bucket = await getArModelsBucket();
    const fileId = doc.fileId instanceof ObjectId ? doc.fileId : new ObjectId(String(doc.fileId));

    if (file && file instanceof File && file.size > 0 && file.name.toLowerCase().endsWith('.glb')) {
      await bucket.delete(fileId);
      const buffer = Buffer.from(await file.arrayBuffer());
      const newId = new ObjectId();
      const uploadStream = bucket.openUploadStreamWithId(newId, file.name, { contentType: 'model/gltf-binary' });
      await new Promise<void>((resolve, reject) => {
        uploadStream.on('finish', () => resolve());
        uploadStream.on('error', reject);
        uploadStream.end(buffer);
      });
      const set: Record<string, unknown> = { fileId: newId };
      if (name != null) set.name = name;
      if (geoLocation != null && !clearGeo) set.geoLocation = geoLocation;
      await coll.updateOne(
        { _id: new ObjectId(id) },
        clearGeo ? { $set: set, $unset: { geoLocation: '' as unknown } } : { $set: set }
      );
    } else {
      const set: Record<string, unknown> = {};
      if (name != null) set.name = name;
      if (geoLocation != null && !clearGeo) set.geoLocation = geoLocation;
      if (Object.keys(set).length > 0) await coll.updateOne({ _id: new ObjectId(id) }, { $set: set });
      if (clearGeo) await coll.updateOne({ _id: new ObjectId(id) }, { $unset: { geoLocation: '' as unknown } });
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

    const bucket = await getArModelsBucket();
    const fileId = doc.fileId instanceof ObjectId ? doc.fileId : new ObjectId(String(doc.fileId));
    await bucket.delete(fileId);
    await coll.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE ar-model:', e);
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
  }
}
