import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { Client as PgClient } from 'pg';
import mysql from 'mysql2/promise';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  try {
    let categories: string[] = [];
    let industries: string[] = [];

    if (conn.dbType === 'MYSQL') {
      const connection = await mysql.createConnection({
        host: conn.host, port: conn.port, database: conn.database,
        user: conn.username, password: conn.password,
        ssl: conn.ssl ? {} : undefined,
        connectTimeout: 5000,
      });

      try {
        const [catRows] = await connection.execute(
          'SELECT name FROM `Category` WHERE isActive = 1 ORDER BY name ASC LIMIT 500'
        ) as any[];
        categories = catRows.map((r: any) => r.name).filter(Boolean);
      } catch { /* table may not exist */ }

      try {
        const [indRows] = await connection.execute(
          'SELECT name FROM `Industry` WHERE isActive = 1 ORDER BY name ASC LIMIT 500'
        ) as any[];
        industries = indRows.map((r: any) => r.name).filter(Boolean);
      } catch { /* table may not exist */ }

      await connection.end();
    } else {
      const client = new PgClient({
        host: conn.host, port: conn.port, database: conn.database,
        user: conn.username, password: conn.password,
        ssl: conn.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
      });
      await client.connect();

      try {
        const res = await client.query(
          'SELECT name FROM "Category" WHERE "isActive" = true ORDER BY name ASC LIMIT 500'
        );
        categories = res.rows.map((r: any) => r.name).filter(Boolean);
      } catch { /* table may not exist */ }

      try {
        const res = await client.query(
          'SELECT name FROM "Industry" WHERE "isActive" = true ORDER BY name ASC LIMIT 500'
        );
        industries = res.rows.map((r: any) => r.name).filter(Boolean);
      } catch { /* table may not exist */ }

      await client.end();
    }

    return NextResponse.json({ categories, industries });
  } catch (error) {
    console.error('[DB-LOOKUP] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch from portal DB' }, { status: 500 });
  }
}
