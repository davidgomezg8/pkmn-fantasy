import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Esta función obtiene los detalles de un Pokémon individual, incluyendo su imagen y stats.
async function getPokemonDetails(url: string) {
  const response = await fetch(url);
  const data = await response.json();

  // Transformamos el array de stats en un objeto más manejable (ej: { hp: 45, attack: 49, ... })
  const stats = data.stats.reduce((acc: any, statEntry: any) => {
    acc[statEntry.stat.name] = statEntry.base_stat;
    return acc;
  }, {});

  console.log('PokeAPI raw data for', data.name, ':', data);
  console.log('Processed stats for', data.name, ':', stats);

  const movesData = await Promise.all(
    data.moves.slice(0, 4).map(async (moveEntry: any) => {
      const moveResponse = await fetch(moveEntry.move.url);
      const moveDetails = await moveResponse.json();
      return {
        name: moveDetails.name,
        power: moveDetails.power || 0, // Algunos movimientos no tienen poder
      };
    })
  );

  const pokemonData = {
    pokemonId: data.id,
    name: data.name,
    image: data.sprites.front_default,
    hp: stats.hp,
    attack: stats.attack,
    defense: stats.defense,
    specialAttack: stats['special-attack'],
    specialDefense: stats['special-defense'],
    speed: stats.speed,
    moves: movesData,
  };

  // Upsert the Pokémon into our database
  const createdOrUpdatedPokemon = await prisma.pokemon.upsert({
    where: { pokemonId: data.id },
    update: pokemonData,
    create: pokemonData,
  });

  return createdOrUpdatedPokemon;
}

export async function GET() {
  try {
    // Primero, obtenemos la lista de los primeros 151 Pokémon.
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=151');
    const data = await response.json();

    // La respuesta inicial solo tiene nombre y URL. Necesitamos obtener los detalles de cada uno.
    const pokemonPromises = data.results.map((p: { name: string; url: string }) => getPokemonDetails(p.url));
    const pokemonList = await Promise.all(pokemonPromises);

    return NextResponse.json(pokemonList);

  } catch (error) {
    console.error('Error fetching from PokéAPI:', error);
    return NextResponse.json({ message: 'Error al obtener los datos de los Pokémon.' }, { status: 500 });
  }
}