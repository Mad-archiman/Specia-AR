import { NextResponse } from 'next/server';
import { getProjectsCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'companyId가 필요합니다.' }, { status: 400 });
    const projects = await getProjectsCollection();
    const list = await projects.find({ companyId: id }).toArray();
    return NextResponse.json({
      items: list.map((p) => ({
        _id: String(p._id),
        companyId: p.companyId,
        year: p.year,
        projectName: p.projectName,
        managerName: p.managerName,
        contact: p.contact,
        email: p.email,
        grantCode: p.grantCode,
        completed: p.completed,
      })),
    });
  } catch (e) {
    console.error('GET projects:', e);
    return NextResponse.json({ error: '목록을 불러올 수 없습니다.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    if (!companyId) return NextResponse.json({ error: 'companyId가 필요합니다.' }, { status: 400 });
    const body = await request.json();
    const {
      year,
      projectName,
      managerName,
      contact,
      email,
      grantCode,
      completed,
    } = body as {
      year?: string;
      projectName?: string;
      managerName?: string;
      contact?: string;
      email?: string;
      grantCode?: string;
      completed?: boolean;
    };
    const projects = await getProjectsCollection();
    const result = await projects.insertOne({
      companyId,
      year: typeof year === 'string' ? year.trim() : '',
      projectName: typeof projectName === 'string' ? projectName.trim() : '',
      managerName: typeof managerName === 'string' ? managerName.trim() : '',
      contact: typeof contact === 'string' ? contact.trim() : '',
      email: typeof email === 'string' ? email.trim() : '',
      grantCode: typeof grantCode === 'string' ? grantCode.trim() : '',
      completed: Boolean(completed),
    });
    return NextResponse.json({ _id: String(result.insertedId) });
  } catch (e) {
    console.error('POST project:', e);
    return NextResponse.json({ error: '등록할 수 없습니다.' }, { status: 500 });
  }
}
