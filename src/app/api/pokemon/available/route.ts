import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  console.log('[GET /api/pokemon/available] Request received.');
  try {
    const availablePokemons = await prisma.pokemon.findMany({
      where: {
        leagueId: null,
      },
    });
    console.log('[GET /api/pokemon/available] Available Pokemon found:', availablePokemons);
    return NextResponse.json(availablePokemons);

  } catch (error) {
    console.error('Error al obtener Pokémon disponibles:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
