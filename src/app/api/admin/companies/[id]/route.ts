import { NextResponse } from 'next/server';
import { getCompaniesCollection, getProjectsCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 });
    }
    const companies = await getCompaniesCollection();
    const company = await companies.findOne({ _id: new ObjectId(id) });
    if (!company) return NextResponse.json({ error: '회사를 찾을 수 없습니다.' }, { status: 404 });
    const projects = await getProjectsCollection();
    const projectList = await projects.find({ companyId: id }).toArray();
    return NextResponse.json({
      company: {
        _id: String(company._id),
        companyName: company.companyName,
        contact: company.contact,
        email: company.email,
      },
      projects: projectList.map((p) => ({
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
    console.error('GET company:', e);
    return NextResponse.json({ error: '조회할 수 없습니다.' }, { status: 500 });
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
    const body = await request.json();
    const { companyName, contact, email } = body as { companyName?: string; contact?: string; email?: string };
    const companies = await getCompaniesCollection();
    const result = await companies.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...(companyName != null && { companyName: String(companyName).trim() }),
          ...(contact != null && { contact: String(contact).trim() }),
          ...(email != null && { email: String(email).trim() }),
        },
      },
      { returnDocument: 'after' }
    );
    if (!result) return NextResponse.json({ error: '회사를 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json({ _id: id });
  } catch (e) {
    console.error('PUT company:', e);
    return NextResponse.json({ error: '수정할 수 없습니다.' }, { status: 500 });
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
    const companies = await getCompaniesCollection();
    const projects = await getProjectsCollection();
    await projects.deleteMany({ companyId: id });
    const result = await companies.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: '회사를 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE company:', e);
    return NextResponse.json({ error: '삭제할 수 없습니다.' }, { status: 500 });
  }
}
