import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { battleManager } from '@/lib/battle-manager';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { leagueId, opponentTeamId } = await request.json();
    const userId = parseInt((session.user as any).id, 10);
    const userEmail = session.user.email as string;

    if (!leagueId || !opponentTeamId) {
      return NextResponse.json({ message: 'Faltan parámetros en la solicitud' }, { status: 400 });
    }

    const currentUserTeam = await prisma.team.findFirst({
      where: { leagueId, userId },
    });

    if (!currentUserTeam) {
      return NextResponse.json({ message: 'No se encontró el equipo del usuario actual en esta liga' }, { status: 404 });
    }

    const opponentTeam = await prisma.team.findUnique({
      where: { id: opponentTeamId },
    });

    if (!opponentTeam) {
      return NextResponse.json({ message: 'No se encontró el equipo del oponente' }, { status: 404 });
    }

    // Create a new Battle record
    const newBattle = await prisma.battle.create({
      data: {
        leagueId,
        trainerAId: currentUserTeam.id,
        trainerBId: opponentTeam.id,
        winnerId: null,
        powerA: 0, // Initial power, can be calculated later
        powerB: 0, // Initial power, can be calculated later
        status: 'PENDING', // Initial status
        currentTurn: 0,
        log: [], // Empty JSON array
        pokemonAState: {}, // Empty JSON object
        pokemonBState: {}, // Empty JSON object
        activePokemonAId: null,
        activePokemonBId: null,
        turnOrder: [], // Empty JSON array
      },
    });

    // Use battleManager to send the challenge
    battleManager.challengePlayer(opponentTeam.userId, userEmail, newBattle.id);

    return NextResponse.json({ message: 'Desafío enviado exitosamente', battleId: newBattle.id });

  } catch (error) {
    console.error('Error creating challenge:', error);
    return NextResponse.json({ message: 'Error al crear el desafío' }, { status: 500 });
  }
}