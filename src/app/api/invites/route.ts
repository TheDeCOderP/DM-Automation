import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { InvitationStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
    const token = await getToken({ req });
    if (!token || !token.sub) return new NextResponse('Unauthorized', { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // 'received' for invites sent to me

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
            where: {
                invitedById: token.id,
            },
        });

        return NextResponse.json({ invites }, { status: 200 });
    } catch (error) {
        console.error('Error fetching invites:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const token = await getToken({ req });
    if (!token) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { token, status } = await req.json();

        if(!token || !status) {
            return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
        }

        const invitation = await prisma.brandInvitation.update({
            where: { token },
            data: { status }
        });
        if (!invitation) {
            return NextResponse.json({ message: 'Invitation not found' }, { status: 404 });
        }


        if(status === InvitationStatus.ACCEPTED) {
            // Get roleId from invitation metadata, or default to BrandUser
            let roleId = invitation.metadata && typeof invitation.metadata === 'object' && 'roleId' in invitation.metadata 
                ? (invitation.metadata as any).roleId 
                : null;

            // If no roleId in metadata, find the BrandUser role as default
            if (!roleId) {
                const brandUserRole = await prisma.role.findFirst({
                    where: { name: "BrandUser" }
                });

                if (!brandUserRole) {
                    return NextResponse.json(
                        { message: "BrandUser role not found. Please run database seed." },
                        { status: 500 }
                    );
                }
                roleId = brandUserRole.id;
            }

            await prisma.userBrand.create({
                data: {
                    roleId: roleId,
                    brandId: invitation.brandId,
                    userId: invitation.invitedToId,
                }
            });
        }

        return NextResponse.json({ invitation }, { status: 200 });
    } catch (error) {
        console.error('Error updating invitation:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
