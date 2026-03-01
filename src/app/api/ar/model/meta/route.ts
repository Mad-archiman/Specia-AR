import { NextResponse } from 'next/server';
import { getArModelsCollection } from '@/lib/db';
import { geoidToEllipsoid } from '@/lib/geo';

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

    if (!doc.geoLocation || typeof doc.geoLocation.lat !== 'number' || typeof doc.geoLocation.lon !== 'number') {
      return NextResponse.json({ error: '이 모델에는 위치 정보가 설정되지 않았습니다.' }, { status: 404 });
    }

    const lat = doc.geoLocation.lat;
    const lon = doc.geoLocation.lon;
    const altGeoid = doc.geoLocation.alt ?? 0;
    const alt = geoidToEllipsoid(lat, lon, altGeoid);

    return NextResponse.json({
      lat,
      lon,
      alt,
    });
  } catch (e) {
    console.error('GET ar model meta:', e);
    return NextResponse.json({ error: '메타 정보를 불러올 수 없습니다.' }, { status: 500 });
  }
}
