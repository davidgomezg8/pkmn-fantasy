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
    const userId = parseInt(session.user.id as string, 10);
    const { searchParams } = new URL(request.url);
    const leagueIdParam = searchParams.get('leagueId');
    const leagueId = leagueIdParam ? parseInt(leagueIdParam, 10) : undefined;

    const whereClause: { userId: number; leagueId?: number } = { userId: userId };
    if (leagueId) {
      whereClause.leagueId = leagueId;
    }

    const team = await prisma.team.findFirst({
      where: whereClause,
      include: {
        pokemons: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ message: 'No se encontró un equipo para este usuario en la liga seleccionada.' }, { status: 404 });
    }

    console.log('Team object returned by API:', team);
    return NextResponse.json(team);

  } catch (error) {
    console.error('Error al obtener el equipo:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
