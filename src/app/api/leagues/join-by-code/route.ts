import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  try {
    const { joinCode } = await request.json();
    const userId = parseInt(session.user.id as string, 10);

    if (!joinCode) {
      return NextResponse.json({ message: 'Código de unión es requerido.' }, { status: 400 });
    }

    // 1. Find the league by joinCode
    const league = await prisma.league.findUnique({
      where: { joinCode: joinCode.toUpperCase() },
      include: {
        teams: true, // Include existing teams to check player count
      },
    });

    if (!league) {
      return NextResponse.json({ message: 'Código de liga inválido.' }, { status: 404 });
    }

    // 2. Check if the user is already in the league
    const isUserInLeague = league.teams.some(team => team.userId === userId);
    if (isUserInLeague) {
      return NextResponse.json({ message: 'Ya eres miembro de esta liga.' }, { status: 400 });
    }

    // 3. Check if the league has reached max players
    if (league.teams.length >= league.maxPlayers) {
      return NextResponse.json({ message: 'La liga ha alcanzado el número máximo de jugadores.' }, { status: 400 });
    }

    // 4. Add the user to the league (create a new team)
    const newTeam = await prisma.team.create({
      data: {
        userId: userId,
        leagueId: league.id,
      },
    });

    return NextResponse.json({ message: 'Te has unido a la liga exitosamente.', team: newTeam }, { status: 200 });

  } catch (error) {
    console.error('Error al unirse a la liga por código:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
