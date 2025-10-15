import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { simulateBattle } from '@/lib/battle';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { leagueId, opponentTeamId } = await request.json();
    const userId = parseInt(session.user.id as string, 10);

    if (!leagueId || !opponentTeamId) {
      return NextResponse.json({ message: 'Faltan parámetros en la solicitud' }, { status: 400 });
    }

    // Find the current user's team in the specified league
    const currentUserTeam = await prisma.team.findFirst({
      where: { leagueId, userId },
      include: { pokemons: true },
    });

    if (!currentUserTeam) {
      return NextResponse.json({ message: 'No se encontró el equipo del usuario actual en esta liga' }, { status: 404 });
    }

    // Find the opponent's team
    const opponentTeam = await prisma.team.findUnique({
      where: { id: opponentTeamId },
      include: { pokemons: true },
    });

    if (!opponentTeam) {
      return NextResponse.json({ message: 'No se encontró el equipo del oponente' }, { status: 404 });
    }

    // Simulate the battle
    const battleResult = simulateBattle(currentUserTeam.pokemons, opponentTeam.pokemons);

    // Determine the winner's team ID
    let winnerId: number | null = null;
    if (battleResult.winner === 'teamA') {
      winnerId = currentUserTeam.id;
    } else if (battleResult.winner === 'teamB') {
      winnerId = opponentTeam.id;
    }

    // Create a new Battle record
    const newBattle = await prisma.battle.create({
      data: {
        leagueId,
        trainerAId: currentUserTeam.id,
        trainerBId: opponentTeam.id,
        winnerId,
        powerA: battleResult.powerA,
        powerB: battleResult.powerB,
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

    return NextResponse.json(newBattle);

  } catch (error) {
    console.error('Error creating battle:', error);
    return NextResponse.json({ message: 'Error al crear la batalla' }, { status: 500 });
  }
}