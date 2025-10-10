export interface Pokemon {
  id: number;
  name: string;
  image: string;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    'special-attack': number;
    'special-defense': number;
    speed: number;
  };
}

// Calcula el poder total de un equipo sumando el ataque de cada Pokémon.
function calculateTeamPower(team: Pokemon[]): number {
  return team.reduce((totalPower, pokemon) => totalPower + pokemon.stats.attack, 0);
}

// Simula una batalla entre dos equipos y devuelve el resultado.
export function simulateBattle(teamA: Pokemon[], teamB: Pokemon[]) {
  const powerA = calculateTeamPower(teamA);
  const powerB = calculateTeamPower(teamB);

  let winner: 'teamA' | 'teamB' | 'draw';
  if (powerA > powerB) {
    winner = 'teamA';
  } else if (powerB > powerA) {
    winner = 'teamB';
  } else {
    winner = 'draw';
  }

  return {
    winner,
    powerA,
    powerB,
    teamA,
    teamB,
  };
}
