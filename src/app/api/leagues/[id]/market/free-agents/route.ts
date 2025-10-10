import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Params {
  id: string;
}

export async function GET(request: Request, context: { params: Params }) {
  try {
    const { id } = context.params;
    const leagueId = parseInt(id, 10);

    if (isNaN(leagueId)) {
      return NextResponse.json({ error: 'Invalid League ID' }, { status: 400 });
    }

    const freeAgents = await prisma.pokemon.findMany({
      where: {
        leagueId: leagueId,
        teamId: null,
      },
      orderBy: {
        pokemonId: 'asc',
      },
    });

    return NextResponse.json(freeAgents, { status: 200 });
  } catch (error) {
    console.error('Error fetching free agents:', error);
    return NextResponse.json({ error: 'Failed to fetch free agents' }, { status: 500 });
  }
}