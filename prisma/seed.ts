import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs'; // Need to import bcrypt

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Limpiar datos existentes (en orden inverso de dependencia)
  await prisma.pokemon.deleteMany();
  await prisma.team.deleteMany();
  await prisma.league.deleteMany();
  await prisma.user.deleteMany();

  // Crear un usuario por defecto para ser el creador de las ligas
  const hashedPassword = await bcrypt.hash('password123', 10); // Hash a default password
  const defaultUser = await prisma.user.create({
    data: {
      email: 'creator@example.com',
      password: hashedPassword,
    },
  });
  console.log(`Created default user: ${defaultUser.email} (ID: ${defaultUser.id})`);

  // Crear Ligas de ejemplo con el usuario por defecto como creador
  const kantoLeague = await prisma.league.create({
    data: {
      name: 'Liga Añil de Kanto',
      creatorId: defaultUser.id,
      status: 'OPEN', // Set initial status
      maxPlayers: 8,
      joinCode: 'KANT01',
      teams: {
        create: { userId: defaultUser.id }, // Add creator to the league
      },
    },
  });
  console.log(`Kanto League ID: ${kantoLeague.id}`);

  const johtoLeague = await prisma.league.create({
    data: {
      name: 'Torneo de Campeones de Johto',
      creatorId: defaultUser.id,
      status: 'OPEN',
      maxPlayers: 8,
      joinCode: 'J0HT02',
      teams: {
        create: { userId: defaultUser.id }, // Add creator to the league
      },
    },
  });

  const hoennLeague = await prisma.league.create({
    data: {
      name: 'Gran Festival de Hoenn',
      creatorId: defaultUser.id,
      status: 'OPEN',
      maxPlayers: 8,
      joinCode: 'H0ENN3',
      teams: {
        create: { userId: defaultUser.id }, // Add creator to the league
      },
    },
  });

  // Fetch and seed Pokémon data
  console.log('Fetching Pokémon data from PokeAPI...');
  const POKEMON_COUNT = 151; // First 151 Pokémon (Gen 1)
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
        return {
          name: moveDetails.name,
          power: moveDetails.power || 0,
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
      specialAttack: stats['special-attack'] || 0,
      specialDefense: stats['special-defense'] || 0,
      speed: stats.speed || 0,
      leagueId: null, // Assign to Kanto League
      teamId: null,
      order: 0,
      moves: movesData, // Add moves data
    });
  }

  await prisma.pokemon.createMany({
    data: pokemonData,
  });
  console.log(`Seeded ${POKEMON_COUNT} Pokémon.`);

  console.log('Seeding finished.');
  console.log(`Created league: ${kantoLeague.name} (ID: ${kantoLeague.id})`);
  console.log(`Created league: ${johtoLeague.name} (ID: ${johtoLeague.id})`);
  console.log(`Created league: ${hoennLeague.name} (ID: ${hoennLeague.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });