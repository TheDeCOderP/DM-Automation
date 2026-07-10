import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { InvitationStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
    const token = await getToken({ req });
    if (!token || !token.id) return new NextResponse('Unauthorized', { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');

        if (type === 'received') {
            const invites = await prisma.brandInvitation.findMany({
                where: {
                    invitedToId: token.id,
                    status: 'PENDING',
                    expiresAt: { gt: new Date() },
                },
                include: {
                    brand: { select: { id: true, name: true, logo: true, description: true } },
                    invitedBy: { select: { name: true, email: true, image: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
            return NextResponse.json({ invites }, { status: 200 });
        }

        const invites = await prisma.brandInvitation.findMany({
            where: { invitedById: token.id },
            include: {
                brand: { select: { id: true, name: true, logo: true } },
                invitedTo: { select: { id: true, name: true, email: true, image: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ invites }, { status: 200 });
    } catch (error) {
        console.error('Error fetching invites:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const token = await getToken({ req });
    if (!token || !token.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { token: inviteToken, status } = await req.json();

        if (!inviteToken || !status) {
            return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
        }

        const invitation = await prisma.brandInvitation.findUnique({
            where: { token: inviteToken },
        });

        if (!invitation) {
            return NextResponse.json({ message: 'Invitation not found' }, { status: 404 });
        }

        if (invitation.status !== 'PENDING') {
            return NextResponse.json({ message: 'Invitation is no longer pending' }, { status: 400 });
        }

        if (invitation.expiresAt < new Date()) {
            return NextResponse.json({ message: 'Invitation has expired' }, { status: 400 });
        }

        const updatedInvitation = await prisma.brandInvitation.update({
            where: { token: inviteToken },
            data: { status },
        });

        if (status === InvitationStatus.ACCEPTED) {
            let roleId =
                invitation.metadata &&
                typeof invitation.metadata === 'object' &&
                'roleId' in invitation.metadata
                    ? (invitation.metadata as any).roleId
                    : null;

            if (!roleId) {
                const brandUserRole = await prisma.role.findFirst({
                    where: { name: 'BrandUser' },
                });
                if (!brandUserRole) {
                    return NextResponse.json(
                        { message: 'BrandUser role not found. Please run database seed.' },
                        { status: 500 }
                    );
                }
                roleId = brandUserRole.id;
            }

            // Upsert prevents duplicate member if accepted more than once (race condition)
            await prisma.userBrand.upsert({
                where: {
                    userId_brandId: {
                        userId: invitation.invitedToId,
                        brandId: invitation.brandId,
                    },
                },
                create: {
                    roleId,
                    brandId: invitation.brandId,
                    userId: invitation.invitedToId,
                },
                update: { roleId },
            });
        }

        return NextResponse.json({ invitation: updatedInvitation }, { status: 200 });
    } catch (error) {
        console.error('Error updating invitation:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
