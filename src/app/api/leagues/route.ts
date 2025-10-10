import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  try {
    // @ts-ignore
    const userId = parseInt(session.user.id, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ message: 'ID de usuario inválido en la sesión.' }, { status: 400 });
    }

    const leagues = await prisma.league.findMany({
      where: {
        OR: [
          { creatorId: userId },
          {
            teams: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        maxPlayers: true, // Include maxPlayers for the frontend
        joinCode: true, // Include joinCode for the frontend
        teams: { // Include teams to get the count
          select: {
            id: true, // Just need to select something to count them
          },
        },
      },
    });

    // Format the leagues to include the member count
    const formattedLeagues = leagues.map(league => ({
      id: league.id,
      name: league.name,
      maxPlayers: league.maxPlayers,
      joinCode: league.joinCode,
      members: league.teams.length, // Now 'members' is a number
    }));

    return NextResponse.json(formattedLeagues);

  } catch (error) {
    console.error('Error al obtener las ligas del usuario:', error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener ligas.' }, { status: 500 });
  }
}