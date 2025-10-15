import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from '../../../auth/[...nextauth]/route'; // Import authOptions

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions); // Pass authOptions here
  if (!session || !session.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tradeId = parseInt(params.id);
    // @ts-expect-error: NextAuth session.user.id type mismatch
    const currentUserId = parseInt(session.user.id as string);

    // 1. Find the trade and verify it's pending
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        proposingTeam: true,
        targetTeam: true,
      }
    });

    if (!trade || trade.status !== 'PENDING') {
      return NextResponse.json({ message: 'Trade not found or not pending.' }, { status: 404 });
    }

    // 2. Verify the current user is part of the trade (either proposer or target)
    if (trade.proposingTeam.userId !== currentUserId && trade.targetTeam.userId !== currentUserId) {
        return NextResponse.json({ message: 'You are not authorized to reject this trade.' }, { status: 403 });
    }

    // 3. Update the trade status to REJECTED
    await prisma.trade.update({
        where: { id: tradeId },
        data: { status: 'REJECTED' }
    });

    return NextResponse.json({ message: 'Trade rejected successfully.' });

  } catch (error) {
    console.error('Error rejecting trade:', error);
    return NextResponse.json({ message: 'Error rejecting trade' }, { status: 500 });
  }
}
