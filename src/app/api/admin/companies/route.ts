import { NextResponse } from 'next/server';
import { getCompaniesCollection, getProjectsCollection } from '@/lib/db';

export const runtime = 'nodejs';
const MAX_LIST = 50;

export async function GET() {
  try {
    const companies = await getCompaniesCollection();
    const projects = await getProjectsCollection();
    const list = await companies.find({}).limit(MAX_LIST).toArray();
    const counts = await projects.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$companyId', count: { $sum: 1 } } },
    ]).toArray();
    const countMap = new Map(counts.map((c) => [c._id, c.count]));
    const items = list.map((c) => ({
      _id: String(c._id),
      companyName: c.companyName,
      contact: c.contact,
      email: c.email,
      projectCount: countMap.get(String(c._id)) ?? 0,
    }));
    return NextResponse.json({ items });
  } catch (e) {
    console.error('GET companies:', e);
    return NextResponse.json({ error: '목록을 불러올 수 없습니다.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, contact, email } = body as { companyName?: string; contact?: string; email?: string };
    if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
      return NextResponse.json({ error: '회사명을 입력해 주세요.' }, { status: 400 });
    }
    const companies = await getCompaniesCollection();
    const result = await companies.insertOne({
      companyName: companyName.trim(),
      contact: typeof contact === 'string' ? contact.trim() : '',
      email: typeof email === 'string' ? email.trim() : '',
    });
    return NextResponse.json({ _id: String(result.insertedId) });
  } catch (e) {
    console.error('POST company:', e);
    return NextResponse.json({ error: '등록할 수 없습니다.' }, { status: 500 });
  }
}
