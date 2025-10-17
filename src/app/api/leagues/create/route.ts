import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Function to generate a unique 6-character alphanumeric code
const generateUniqueCode = async (): Promise<string> => {
  let code;
  let isUnique = false;
  while (!isUnique) {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existingLeague = await prisma.league.findUnique({ where: { joinCode: code } });
    if (!existingLeague) {
      isUnique = true;
    }
  }
  return code;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  try {
    const { name, maxPlayers } = await request.json();
    const creatorId = parseInt(session.user.id as string, 10);

    if (!name || !maxPlayers) {
      return NextResponse.json({ message: 'Nombre de liga y número máximo de jugadores son requeridos.' }, { status: 400 });
    }

    if (isNaN(maxPlayers) || maxPlayers < 2 || maxPlayers > 10) { // Example limits
      return NextResponse.json({ message: 'El número máximo de jugadores debe ser entre 2 y 10.' }, { status: 400 });
    }

    const joinCode = await generateUniqueCode();

    const newLeague = await prisma.league.create({
      data: {
        name,
        creatorId,
        maxPlayers,
        joinCode,
      },
    });

    // Automatically add the creator as a member of their own league, if they don't already have one
    const existingCreatorTeam = await prisma.team.findFirst({
      where: {
        userId: creatorId,
        leagueId: newLeague.id,
      },
    });

    if (!existingCreatorTeam) {
      await prisma.team.create({
        data: {
          userId: creatorId,
          leagueId: newLeague.id,
        },
      });
    }

    // --- New Logic: Populate league with Pokémon ---
    const POKEMON_COUNT = 151; // First 151 Pokémon (Gen 1)
    console.log(`Fetching Pokémon data for league ${newLeague.id} from PokeAPI...`);
    const pokemonData = [];

    for (let i = 1; i <= POKEMON_COUNT; i++) {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${i}`);
      const data = await response.json();

      const stats = data.stats.reduce((acc: any, stat: any) => {
        acc[stat.stat.name.replace('-', '')] = stat.base_stat;
        return acc;
      }, {});

      const movesData = await Promise.all(
        data.moves.slice(0, 4).map(async (moveEntry: any) => {
          const moveResponse = await fetch(moveEntry.move.url);
          const moveDetails = await moveResponse.json();
          let category: 'physical' | 'special' | 'status';
          switch (moveDetails.damage_class.name) {
            case 'physical':
              category = 'physical';
              break;
            case 'special':
              category = 'special';
              break;
            case 'status':
              category = 'status';
              break;
            default:
              category = 'status'; // Default to status if unknown
          }
          return {
            name: moveDetails.name,
            power: moveDetails.power || 0,
            category: category,
          };
        })
      );

      pokemonData.push({
        pokemonId: data.id,
        name: data.name,
        image: data.sprites.front_default,
        hp: stats.hp || 0,
        attack: stats.attack || 0,
        defense: stats.defense || 0,
        specialAttack: stats.specialattack || 0,
        specialDefense: stats.specialdefense || 0,
        speed: stats.speed || 0,
        leagueId: newLeague.id, // Assign to the specific league
        teamId: null,
        order: 0,
        moves: movesData,
      });
    }

    await prisma.pokemon.createMany({
      data: pokemonData,
    });
    console.log(`Seeded ${POKEMON_COUNT} Pokémon for league ${newLeague.id}.`);
    // --- End New Logic ---

    return NextResponse.json({ message: 'Liga creada exitosamente.', league: newLeague }, { status: 201 });

  } catch (error) {
    console.error('Error al crear la liga:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}