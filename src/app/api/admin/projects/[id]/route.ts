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
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 });
    }
    const projects = await getProjectsCollection();
    const project = await projects.findOne({ _id: new ObjectId(id) });
    if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json({
      _id: String(project._id),
      companyId: project.companyId,
      year: project.year,
      projectName: project.projectName,
      managerName: project.managerName,
      contact: project.contact,
      email: project.email,
      grantCode: project.grantCode,
      completed: project.completed,
    });
  } catch (e) {
    console.error('GET project:', e);
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
    const project = await projects.findOne({ _id: new ObjectId(id) });
    if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 });

    await projects.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          year: typeof year === 'string' ? year.trim() : project.year,
          projectName: typeof projectName === 'string' ? projectName.trim() : project.projectName,
          managerName: typeof managerName === 'string' ? managerName.trim() : project.managerName,
          contact: typeof contact === 'string' ? contact.trim() : project.contact,
          email: typeof email === 'string' ? email.trim() : project.email,
          grantCode: typeof grantCode === 'string' ? grantCode.trim() : project.grantCode,
          completed: typeof completed === 'boolean' ? completed : project.completed,
        },
      }
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('PUT project:', e);
    return NextResponse.json({ error: '수정할 수 없습니다.' }, { status: 500 });
  }
}
