import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

async function getConnectionAndVerify(id: string, userId: string) {
  const conn = await prisma.databaseConnection.findUnique({
    where: { id },
    include: { brand: { include: { members: true } } },
  });
  if (!conn) return null;
  const isMember = conn.brand.members.some(m => m.userId === userId);
  return isMember ? conn : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const conn = await getConnectionAndVerify(id, token.id);
  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { password: _, ...safe } = conn;
  return NextResponse.json({ connection: safe });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const existing = await getConnectionAndVerify(id, token.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { name, dbType, host, port, database, username, password, ssl, blogTable, fieldMapping, isActive } = body;

  const updated = await prisma.databaseConnection.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(dbType && { dbType }),
      ...(host && { host }),
      ...(port && { port: Number(port) }),
      ...(database && { database }),
      ...(username && { username }),
      ...(password && { password }),
      ...(ssl !== undefined && { ssl: Boolean(ssl) }),
      ...(blogTable && { blogTable }),
      ...(fieldMapping && { fieldMapping }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
  });

  const { password: _, ...safe } = updated;
  return NextResponse.json({ connection: safe });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const existing = await getConnectionAndVerify(id, token.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.databaseConnection.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
