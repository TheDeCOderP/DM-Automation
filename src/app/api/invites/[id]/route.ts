// app/api/invites/[id]/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invitationId } = await context.params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { message: 'Token is required' },
        { status: 400 }
      );
    }

    const invitation = await prisma.brandInvitation.findUnique({
      where: { 
        id: invitationId,
        token: token 
      },
      include: {
        brand: {
          select: {
            name: true,
            description: true,
            logo: true,
          },
        },
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { message: 'Invalid or expired invitation' },
        { status: 404 }
      );
    }

    return NextResponse.json({ invitation }, { status: 200 });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { message: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}