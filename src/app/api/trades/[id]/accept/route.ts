import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth';

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
    });

    if (!trade || trade.status !== 'PENDING') {
      return NextResponse.json({ message: 'Trade not found or not pending.' }, { status: 404 });
    }

    // 2. Verify the current user is the target of the trade
    const targetTeam = await prisma.team.findUnique({
        where: { id: trade.targetTeamId }
    });

    if (!targetTeam || targetTeam.userId !== currentUserId) {
        return NextResponse.json({ message: 'You are not authorized to accept this trade.' }, { status: 403 });
    }

    // 3. Perform the swap in a transaction
    await prisma.$transaction(async (tx) => {
        // Update offered Pokemon to target team
        await tx.pokemon.update({
            where: { id: trade.offeredPokemonId },
            data: { teamId: trade.targetTeamId }
        });

        // Update requested Pokemon to proposing team
        await tx.pokemon.update({
            where: { id: trade.requestedPokemonId },
            data: { teamId: trade.proposingTeamId }
        });

        // Update the current trade status to ACCEPTED
        await tx.trade.update({
            where: { id: tradeId },
            data: { status: 'ACCEPTED' }
        });

        // 4. Cancel other pending trades involving these Pokémon
        await tx.trade.updateMany({
            where: {
                status: 'PENDING',
                id: { not: tradeId },
                OR: [
                    { offeredPokemonId: trade.offeredPokemonId },
                    { requestedPokemonId: trade.offeredPokemonId },
                    { offeredPokemonId: trade.requestedPokemonId },
                    { requestedPokemonId: trade.requestedPokemonId },
                ]
            },
            data: { status: 'CANCELED' }
        });
    });

    return NextResponse.json({ message: 'Trade accepted successfully.' });

  } catch (error) {
    console.error('Error accepting trade:', error);
    return NextResponse.json({ message: 'Error accepting trade' }, { status: 500 });
  }
}
