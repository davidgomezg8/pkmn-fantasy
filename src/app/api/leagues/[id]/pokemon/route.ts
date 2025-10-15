import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  try {
    const leagueId = parseInt((await params).id, 10);
    const userId = parseInt(session.user.id as string, 10);

    if (isNaN(leagueId)) {
      return NextResponse.json({ message: 'ID de liga inválido.' }, { status: 400 });
    }

    // Verify that the user is a member of this league
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        teams: { where: { userId: userId } },
      },
    });

    if (!league || league.teams.length === 0) {
      return NextResponse.json({ message: 'No eres miembro de esta liga.' }, { status: 403 });
    }

    const leaguePokemons = await prisma.pokemon.findMany({
      where: {
        leagueId: leagueId,
      },
      orderBy: {
        order: 'asc',
      },
    });

    return NextResponse.json(leaguePokemons);

  } catch (error) {
    console.error('Error al obtener los Pokémon de la liga:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
