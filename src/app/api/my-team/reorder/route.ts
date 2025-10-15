import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  try {
    const userId = parseInt(session.user.id as string, 10);
    const { pokemonIds } = await request.json(); // Expects an array of Pokémon IDs in the new order

    if (!Array.isArray(pokemonIds)) {
      return NextResponse.json({ message: 'Formato de datos inválido. Se esperaba un array de IDs de Pokémon.' }, { status: 400 });
    }

    // Verify that all Pokémon belong to the user's team
    const userTeam = await prisma.team.findFirst({
      where: { userId: userId },
      include: {
        pokemons: true,
      },
    });

    if (!userTeam) {
      return NextResponse.json({ message: 'No se encontró un equipo para este usuario.' }, { status: 404 });
    }

    const teamPokemonIds = userTeam.pokemons.map(p => p.id);
    const invalidPokemon = pokemonIds.find(id => !teamPokemonIds.includes(id));

    if (invalidPokemon) {
      return NextResponse.json({ message: `Pokémon con ID ${invalidPokemon} no pertenece a tu equipo.` }, { status: 403 });
    }

    // Update the order for each Pokémon
    const transaction = await prisma.$transaction(
      pokemonIds.map((id, index) =>
        prisma.pokemon.update({
          where: { id: id },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ message: 'Orden de Pokémon actualizada exitosamente.', transaction });

  } catch (error) {
    console.error('Error al reordenar Pokémon:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
