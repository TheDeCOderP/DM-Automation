import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { testConnection } from '@/lib/external-db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const conn = await prisma.databaseConnection.findUnique({
    where: { id },
    include: { brand: { include: { members: true } } },
  });

  if (!conn || !conn.brand.members.some(m => m.userId === token.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const result = await testConnection({
    dbType: conn.dbType,
    host: conn.host,
    port: conn.port,
    database: conn.database,
    username: conn.username,
    password: conn.password,
    ssl: conn.ssl,
  });

  await prisma.databaseConnection.update({
    where: { id },
    data: {
      lastTestedAt: new Date(),
      testStatus: result.success ? 'SUCCESS' : 'FAILED',
      testError: result.error || null,
    },
  });

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
