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
    const pokemonId = parseInt((await params).id, 10);
    const { nickname } = await request.json();
    const userId = parseInt(session.user.id as string, 10);

    if (isNaN(pokemonId)) {
      return NextResponse.json({ message: 'ID de Pokémon inválido.' }, { status: 400 });
    }

    // Verify that the Pokémon belongs to the authenticated user's team
    const pokemon = await prisma.pokemon.findUnique({
      where: { id: pokemonId },
      include: {
        team: true,
      },
    });

    if (!pokemon || !pokemon.team || pokemon.team.userId !== userId) {
      return NextResponse.json({ message: 'Pokémon no encontrado o no pertenece a tu equipo.' }, { status: 403 });
    }

    const updatedPokemon = await prisma.pokemon.update({
      where: { id: pokemonId },
      data: { nickname: nickname || null }, // Set to null if nickname is empty
    });

    return NextResponse.json({ message: 'Mote actualizado exitosamente.', pokemon: updatedPokemon });

  } catch (error) {
    console.error('Error al actualizar el mote del Pokémon:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
