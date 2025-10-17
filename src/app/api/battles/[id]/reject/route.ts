import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { battleManager } from '@/lib/battle-manager';

interface Params {
  id: string;
}

export async function POST(request, { params }) {
  try {
    const { id } = context.params;
    const battleId = parseInt(id, 10);

    if (isNaN(battleId)) {
      return NextResponse.json({ error: 'Invalid Battle ID' }, { status: 400 });
    }

    const battle = await prisma.battle.update({
      where: { id: battleId },
      data: {
        status: 'CANCELED',
      },
    });

    // Notify both players that the battle has been rejected
    const battleState = await battleManager.getBattle(battleId);
    const trainerA = battleState.players[battle.trainerAId];
    const trainerB = battleState.players[battle.trainerBId];

    if (battleManager.io) {
      if (trainerA.socketId) {
        battleManager.io.to(trainerA.socketId).emit('battleRejected', { battleId });
      }
      if (trainerB.socketId) {
        battleManager.io.to(trainerB.socketId).emit('battleRejected', { battleId });
      }
    }

    return NextResponse.json(battle, { status: 200 });
  } catch (error) {
    console.error('Error rejecting battle:', error);
    return NextResponse.json({ error: 'Failed to reject battle' }, { status: 500 });
  }
}
