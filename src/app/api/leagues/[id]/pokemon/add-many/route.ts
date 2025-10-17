import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request, { params }) {
  const leagueId = parseInt(params.id);
  const { pokemonIds } = await request.json();

  if (!Array.isArray(pokemonIds) || pokemonIds.length === 0) {
    return NextResponse.json({ message: 'pokemonIds must be a non-empty array' }, { status: 400 });
  }

  try {
    await prisma.pokemon.updateMany({
      where: {
        id: {
          in: pokemonIds,
        },
        leagueId: null, // Only add pokemons that are not already in a league
      },
      data: {
        leagueId: leagueId,
      },
    });

    return NextResponse.json({ message: 'Pokemons added successfully' });
  } catch (error) {
    console.error('Error adding pokemons to league:', error);
    return NextResponse.json({ message: 'Error adding pokemons to league' }, { status: 500 });
  }
}
