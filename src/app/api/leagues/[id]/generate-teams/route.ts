import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request, { params }) {
  const awaitedParams = await params;
  const leagueId = parseInt(awaitedParams.id);
  console.log(`[GenerateTeams API] Received request for leagueId: ${leagueId}`);

          if (isNaN(leagueId)) {
            return NextResponse.json({ message: 'ID de liga inválido.' }, { status: 400 });
          }
      
          try {
            // 1. Verify league existence and status
            const league = await prisma.league.findUnique({
              where: { id: leagueId },
              include: {
                teams: {
                  include: { user: true },
                },
              },
            });
      
            if (!league) {
              console.log(`[GenerateTeams API] League ${leagueId} not found.`);
              return NextResponse.json({ message: 'Liga no encontrada.' }, { status: 404 });
            }
      
            if (league.status !== 'OPEN') {
              console.log(`[GenerateTeams API] League ${leagueId} status is ${league.status}, not OPEN.`);
              return NextResponse.json({ message: 'Los equipos ya han sido generados para esta liga o la liga no está abierta.' }, { status: 400 });
            }
      
            const playersInLeague = league.teams.map(team => team.user);
            console.log(`[GenerateTeams API] Players in league ${leagueId}: ${playersInLeague.length}`);
      
            if (playersInLeague.length === 0) {
              console.log(`[GenerateTeams API] No players in league ${leagueId}.`);
              return NextResponse.json({ message: 'No hay jugadores en la liga para generar equipos.' }, { status: 400 });
            }

    // --- New Logic: Unassign existing Pokémon from teams in this league ---
    await prisma.pokemon.updateMany({
      where: {
        leagueId: leagueId,
        NOT: { teamId: null }, // Only unassign pokemons that are currently on a team
      },
      data: {
        teamId: null,
        order: 0,
      },
    });
    // --- End New Logic ---

            // 2. Fetch all available Pokémon from this league's pool (not assigned to any team)
            const availablePokemon = await prisma.pokemon.findMany({
              where: {
                leagueId: leagueId,
                teamId: null,
              },
            });
            console.log(`[GenerateTeams API] Available Pokémon for league ${leagueId}: ${availablePokemon.length}`);
      
            if (availablePokemon.length < league.teams.length * 6) { // Assuming 6 Pokémon per team
              console.log(`[GenerateTeams API] Not enough Pokémon for league ${leagueId}. Needed: ${league.teams.length * 6}, Available: ${availablePokemon.length}`);
              return NextResponse.json({ message: 'No hay suficientes Pokémon disponibles en el pool de esta liga para generar equipos.' }, { status: 400 });
            }    // 3. Shuffle available Pokémon for random assignment
    const shuffledPokemon = availablePokemon.sort(() => 0.5 - Math.random());

    const pokemonPerPlayer = 6;
    let pokemonOffset = 0;

    // 4. Update database with generated teams and assigned Pokémon
    const transaction = await prisma.$transaction(async (prisma) => {
      for (const team of league.teams) {
        const pokemonForTeam = shuffledPokemon.slice(pokemonOffset, pokemonOffset + pokemonPerPlayer);
        pokemonOffset += pokemonPerPlayer;

        console.log(`Assigning ${pokemonForTeam.length} Pokémon to team ${team.id}:`, pokemonForTeam.map(p => p.name));

        if (pokemonForTeam.length < pokemonPerPlayer) {
          throw new Error('Not enough Pokémon to assign to every team.');
        }

        const pokemonIds = pokemonForTeam.map(p => p.id);

        // Assign Pokémon to the team and set their order
        for (let i = 0; i < pokemonForTeam.length; i++) {
          await prisma.pokemon.update({
            where: { id: pokemonForTeam[i].id },
            data: { teamId: team.id, order: i, leagueId: leagueId }, // Ensure leagueId is set
          });
        }
      }

      // 5. Update league status
      await prisma.league.update({
        where: { id: leagueId },
        data: { status: 'TEAMS_GENERATED' },
      });
    });

    return NextResponse.json({ message: 'Equipos generados y asignados exitosamente.', transaction }, { status: 200 });

  } catch (error) {
    console.error('Error al generar equipos:', error);
    return NextResponse.json({ message: 'Error interno del servidor al generar equipos.' }, { status: 500 });
  }
}
