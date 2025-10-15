import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  try {
    const leagueId = parseInt((await params).id, 10);
    const userId = parseInt(session.user.id as string, 10);
    const { pokemonId } = await request.json();

    if (isNaN(leagueId) || isNaN(pokemonId)) {
      return NextResponse.json({ message: 'IDs inválidos.' }, { status: 400 });
    }

    // Verify that the user is the creator of this league
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league || league.creatorId !== userId) {
      return NextResponse.json({ message: 'Solo el creador de la liga puede eliminar Pokémon.' }, { status: 403 });
    }

    // Verify that the Pokémon exists and belongs to this league
    const existingPokemon = await prisma.pokemon.findUnique({
      where: { id: pokemonId },
    });

    if (!existingPokemon || existingPokemon.leagueId !== leagueId) {
      return NextResponse.json({ message: 'Pokémon no encontrado en esta liga.' }, { status: 404 });
    }

    // Remove the Pokémon from the league's pool and unassign it from any team
    const updatedPokemon = await prisma.pokemon.update({
      where: { id: pokemonId },
      data: { leagueId: null, teamId: null, order: 0 }, // Reset order as well
    });

    return NextResponse.json({ message: 'Pokémon eliminado de la liga exitosamente.', pokemon: updatedPokemon });

  } catch (error) {
    console.error('Error al eliminar Pokémon de la liga:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
