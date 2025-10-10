import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Function to shuffle an array
function shuffle(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const leagueId = parseInt(params.id);

  if (isNaN(leagueId)) {
    return NextResponse.json({ message: 'Invalid league ID' }, { status: 400 });
  }

  try {
    const freeAgents = await prisma.pokemon.findMany({
      where: {
        leagueId: leagueId,
        teamId: null,
      },
    });

    const shuffledAgents = shuffle(freeAgents);
    const random10 = shuffledAgents.slice(0, 10);

    return NextResponse.json(random10);
  } catch (error) {
    console.error('Error fetching free agents:', error);
    return NextResponse.json({ message: 'Error fetching free agents' }, { status: 500 });
  }
}
