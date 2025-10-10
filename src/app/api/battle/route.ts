import { NextResponse } from 'next/server';
import { users } from '@/lib/data';
import { simulateBattle, Pokemon } from '@/lib/battle';

// Función para obtener la lista completa de Pokémon (la usaremos para generar equipos aleatorios)
async function getFullPokemonList(): Promise<Pokemon[]> {
  // Esta es una llamada a nuestro propio API. En un entorno real, podríamos llamar a la función directamente.
  const response = await fetch('http://localhost:3000/api/pokemon'); 
  if (!response.ok) {
    throw new Error('Failed to fetch Pokémon list for battle simulation');
  }
  return response.json();
}

// Genera un equipo aleatorio de 6 Pokémon
function createRandomTeam(pokemonList: Pokemon[]): Pokemon[] {
  const shuffled = [...pokemonList].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 6);
}

export async function POST() {
  try {
    // 1. Obtenemos la lista completa de Pokémon
    const allPokemon = await getFullPokemonList();

    // 2. Seleccionamos dos entrenadores de nuestra BD simulada
    const trainerA = users[0]; // Ash
    const trainerB = users[1]; // Misty

    // 3. Creamos equipos aleatorios para ellos
    const teamA = createRandomTeam(allPokemon);
    const teamB = createRandomTeam(allPokemon);

    // 4. Simulamos la batalla
    const battleResult = simulateBattle(teamA, teamB);

    // 5. Devolvemos el resultado
    return NextResponse.json({
      trainerA: trainerA.name,
      trainerB: trainerB.name,
      ...battleResult,
    });

  } catch (error) {
    console.error('Error during battle simulation:', error);
    return NextResponse.json({ message: 'Error en la simulación de combate' }, { status: 500 });
  }
}
