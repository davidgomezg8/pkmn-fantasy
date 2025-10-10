import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '../../../../auth/[...nextauth]/route';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  try {
    const leagueId = parseInt((await params).id, 10);
    const userId = parseInt((session.user as any).id, 10);
    const { pokemonId } = await request.json();

    if (isNaN(leagueId) || isNaN(pokemonId)) {
      return NextResponse.json({ message: 'IDs inválidos.' }, { status: 400 });
    }

    // Verify that the user is the creator of this league
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league || league.creatorId !== userId) {
      return NextResponse.json({ message: 'Solo el creador de la liga puede añadir Pokémon.' }, { status: 403 });
    }

    // Verify that the Pokémon exists and is not already in a league or assigned to a team
    const existingPokemon = await prisma.pokemon.findUnique({
      where: { id: pokemonId },
    });

    if (!existingPokemon) {
      return NextResponse.json({ message: 'Pokémon no encontrado.' }, { status: 404 });
    }

    if (existingPokemon.leagueId !== null) {
      return NextResponse.json({ message: 'Este Pokémon ya pertenece a una liga.' }, { status: 400 });
    }

    // Add the Pokémon to the league's pool
    const updatedPokemon = await prisma.pokemon.update({
      where: { id: pokemonId },
      data: { leagueId: leagueId },
    });

    return NextResponse.json({ message: 'Pokémon añadido a la liga exitosamente.', pokemon: updatedPokemon });

  } catch (error) {
    console.error('Error al añadir Pokémon a la liga:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
