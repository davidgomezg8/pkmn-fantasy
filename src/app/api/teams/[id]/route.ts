import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  const teamId = parseInt(params.id);

  if (isNaN(teamId)) {
    return NextResponse.json({ message: 'Invalid team ID' }, { status: 400 });
  }

  try {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      include: {
        user: { // Include the team owner's info
          select: {
            id: true,
            email: true,
          }
        },
        pokemons: { // Include the list of Pokémon on the team
          orderBy: {
            order: 'asc'
          }
        },
      },
    });

    if (!team) {
      return NextResponse.json({ message: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error(`Error fetching team ${teamId}:`, error);
    return NextResponse.json({ message: 'Error fetching team' }, { status: 500 });
  }
}
