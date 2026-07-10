import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get('brandId');

  if (!brandId) return NextResponse.json({ error: 'brandId required' }, { status: 400 });

  const userBrand = await prisma.userBrand.findFirst({ where: { userId: token.id, brandId } });
  if (!userBrand) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const connections = await prisma.databaseConnection.findMany({
    where: { brandId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, dbType: true, host: true, port: true,
      database: true, username: true, ssl: true, blogTable: true,
      fieldMapping: true, isActive: true, lastTestedAt: true,
      testStatus: true, testError: true, createdAt: true,
    },
  });

  return NextResponse.json({ connections });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { brandId, name, dbType, host, port, database, username, password, ssl, blogTable, fieldMapping } = body;

  if (!brandId || !name || !dbType || !host || !port || !database || !username || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const userBrand = await prisma.userBrand.findFirst({ where: { userId: token.id, brandId } });
  if (!userBrand) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const connection = await prisma.databaseConnection.create({
    data: {
      brandId, name, dbType, host, port: Number(port), database,
      username, password, ssl: Boolean(ssl),
      blogTable: blogTable || 'Blog',
      fieldMapping: fieldMapping || {},
    },
  });

  return NextResponse.json({ connection }, { status: 201 });
}
