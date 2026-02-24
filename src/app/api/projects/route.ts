import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ProjectData } from '@/types/project';

const filePath = path.join(process.env.HOME || '', 'clawd', 'project-data.json');

function isValidPayload(payload: unknown): payload is ProjectData {
  if (!payload || typeof payload !== 'object') return false;
  const obj = payload as { projects?: unknown };
  return Array.isArray(obj.projects);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!isValidPayload(body)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf8');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed saving project data', error);
    return NextResponse.json({ error: 'Failed to save project data' }, { status: 500 });
  }
}
