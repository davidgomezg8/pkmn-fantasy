import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { battleManager } from '@/lib/battle-manager';

interface Params {
  id: string;
}

export async function POST(request: Request, context: { params: Params }) {
  try {
    const { id } = context.params;
    const battleId = parseInt(id, 10);

    if (isNaN(battleId)) {
      return NextResponse.json({ error: 'Invalid Battle ID' }, { status: 400 });
    }

    const battle = await prisma.battle.update({
      where: { id: battleId },
      data: {
        status: 'IN_PROGRESS',
      },
    });

    // Notify both players that the battle has been accepted and can start
    // For this, we need to fetch the battle state from the manager
    const battleState = await battleManager.getBattle(battleId);
    const trainerA = battleState.players[battle.trainerAId];
    const trainerB = battleState.players[battle.trainerBId];

    if (battleManager.io) {
      console.log(`[API/ACCEPT] Emitting battleAccepted event for battle ${battleId}`);
      console.log(`[API/ACCEPT] Trainer A (ID: ${battle.trainerAId}) socketId: ${trainerA.socketId}`);
      console.log(`[API/ACCEPT] Trainer B (ID: ${battle.trainerBId}) socketId: ${trainerB.socketId}`);

      if (trainerA.socketId) {
        battleManager.io.to(trainerA.socketId).emit('battleAccepted', { battleId, myTeamId: battle.trainerAId });
        console.log(`[API/ACCEPT] battleAccepted emitted to Trainer A (${battle.trainerAId})`);
      } else {
        console.log(`[API/ACCEPT] Trainer A (${battle.trainerAId}) has no socketId.`);
      }
      if (trainerB.socketId) {
        battleManager.io.to(trainerB.socketId).emit('battleAccepted', { battleId, myTeamId: battle.trainerBId });
        console.log(`[API/ACCEPT] battleAccepted emitted to Trainer B (${battle.trainerBId})`);
      } else {
        console.log(`[API/ACCEPT] Trainer B (${battle.trainerBId}) has no socketId.`);
      }
    }

    return NextResponse.json(battle, { status: 200 });
  } catch (error) {
    console.error('Error accepting battle:', error);
    return NextResponse.json({ error: 'Failed to accept battle' }, { status: 500 });
  }
}
