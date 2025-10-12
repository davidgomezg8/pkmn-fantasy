export interface Move {
  name: string;
  power: number;
}

export interface Pokemon {
  id: number;
  pokemonId: number;
  name: string;
  image: string;
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  order: number;
  nickname: string | null;
  leagueId: number | null;
  teamId: number | null;
  moves: Move[];
}

// Calcula el poder total de un equipo
function calculateTeamPower(team: Pokemon[]): number {
  return team.reduce((totalPower, pokemon) => {
    const power = pokemon.attack + pokemon.specialAttack + (pokemon.defense + pokemon.specialDefense) / 2 + pokemon.speed / 2;
    return totalPower + power;
  }, 0);
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
