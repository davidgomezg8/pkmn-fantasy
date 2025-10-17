import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  const awaitedParams = await params;
  const leagueId = parseInt(awaitedParams.id);

  if (isNaN(leagueId)) {
    return NextResponse.json({ message: 'ID de liga inválido.' }, { status: 400 });
  }

  try {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        creator: { select: { id: true, email: true } },
        teams: {
          include: { user: { select: { id: true, email: true } } },
        },
      },
    });

    if (!league) {
      return NextResponse.json({ message: 'Liga no encontrada.' }, { status: 404 });
    }

    // Format the league data to match the frontend's League interface
    const formattedLeague = {
      id: league.id,
      name: league.name,
      creator: { id: league.creator.id, email: league.creator.email }, // Pass the entire creator object
      creatorId: league.creator.id,
      status: league.status,
      maxPlayers: league.maxPlayers,
      joinCode: league.joinCode,
      teams: league.teams.map(team => ({
        id: team.id,
        userId: team.user.id,
        leagueId: team.leagueId,
        user: { id: team.user.id, email: team.user.email },
      })),
    };

    return NextResponse.json(formattedLeague);
  } catch (error) {
    console.error('Error al obtener los detalles de la liga:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
