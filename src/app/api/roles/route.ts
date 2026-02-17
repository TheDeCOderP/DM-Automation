import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const token = await getToken({ req });
    if (!token) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const roles = await prisma.role.findMany({
            select: {
                id: true,
                name: true,
                description: true,
            },
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json({ roles }, { status: 200 });
    } catch (error) {
        console.error('Error fetching roles:', error);
        return NextResponse.json({ message: 'Failed to fetch roles' }, { status: 500 });
    }
}
