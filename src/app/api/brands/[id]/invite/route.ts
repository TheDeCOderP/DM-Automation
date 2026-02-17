import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/services/mailing.service';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const token = await getToken({ req });
    if (!token) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const invitations = await prisma.brandInvitation.findMany({
            where: { invitedById: token.id },
            include: {
                invitedBy: true,
                invitedTo: true,
            },
        });

        return NextResponse.json({ invitations }, { status: 200 });
    } catch (error) {
        console.error('Error fetching invitations:', error);
        return NextResponse.json({ message: 'Failed to fetch invitations' }, { status: 500 });
    }

}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const token = await getToken({ req });
    if (!token) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id: brandId } = await context.params;
        const { userIds, roleId } = await req.json();

        if (!userIds || !brandId) {
            return NextResponse.json({ message: 'Email and Brand ID are required' }, { status: 400 });
        }

        // Validate roleId if provided
        if (roleId) {
            const role = await prisma.role.findUnique({
                where: { id: roleId }
            });
            if (!role) {
                return NextResponse.json({ message: 'Invalid role ID' }, { status: 400 });
            }
        }

        // Verify that the brand exists
        const brand = await prisma.brand.findUnique({
            where: { id: brandId },
        });
        if (!brand) {
            return NextResponse.json({ message: 'Brand not found' }, { status: 404 });
        }

        for(const userId of userIds) {
            
            // Verify that the user exists
            const user = await prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) continue; // Skip if user not found

            // Check if the user is already a member of the brand
            const existingMember = await prisma.userBrand.findUnique({
                where: {
                    userId_brandId: {
                        brandId,
                        userId: user.id,
                    },
                },
            });
            if (existingMember) continue; // Skip if already a member

            // Check for existing pending invitation
            const existingInvitation = await prisma.brandInvitation.findFirst({
                where: {
                    brandId,
                    invitedToId: user.id,
                    invitedById: token.id,
                    status: 'PENDING',
                    expiresAt: { gt: new Date() }
                }
            });
            if (existingInvitation) continue; // Skip if there's already a pending invitation

            const existingUserBrand = await prisma.userBrand.findUnique({
                where: {
                    userId_brandId: {
                        userId: user.id,
                        brandId,
                    },
                },
            });
            if(existingUserBrand) continue;

            // Generate unique token
            const uniqueToken = crypto.randomBytes(32).toString('hex');

            // Create a new invitation for the user to join the brand
            const invitation = await prisma.brandInvitation.create({
                data: {
                    brandId,
                    token: uniqueToken,
                    invitedToId: user.id,
                    invitedById: token.id,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
                    ...(roleId && { metadata: { roleId } }), // Store roleId in metadata only if provided
                },
            });

            // Send invitation email
            await sendMail({
                recipient: user.email,
                subject: `Invitation to join brand ${brand?.name || 'Unknown Brand'}`,
                message: `
                    <p>Hi ${user.name || 'there'},</p>
                    <p>You have been invited to join the brand "${brand?.name || 'Unknown Brand'}". Please click on the link below to accept the invitation:</p>
                    <a href="${process.env.NEXTAUTH_URL}/invites/${invitation.id}?token=${uniqueToken}">Accept Invitation</a>
                    <p>This invitation will expire in 7 days.</p>
                `,
            }).catch((error) => {
                console.error('Error sending invitation email:', error);
            });

        }

        return NextResponse.json({ message: 'Invitation sent successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error sending invitation:', error);
        return NextResponse.json({ message: 'Failed to send invitation' }, { status: 500 });
    }
}