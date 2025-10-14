export interface Move {
  name: string;
  power: number;
  category: 'physical' | 'special' | 'status';
}

export interface Pokemon {
  id: number;
  pokemonId: number;
  name: string;
  image: string;
  hp: number; // Max HP
  currentHp: number; // Current HP in battle
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

// Función para calcular el daño de un movimiento
export function calculateDamage(
  attacker: Pokemon,
  defender: Pokemon,
  move: Move
): number {
  if (move.power === 0) {
    return 0; // Status moves do not deal direct damage
  }

  const level = 50; // Fixed level for simplicity

  let attackStat: number;
  let defenseStat: number;

  if (move.category === 'physical') {
    attackStat = attacker.attack;
    defenseStat = defender.defense;
  } else if (move.category === 'special') {
    attackStat = attacker.specialAttack;
    defenseStat = defender.specialDefense;
  } else {
    return 0; // Status moves do not deal damage
  }

  // Ensure stats are at least 1 to avoid division by zero or zero damage
  attackStat = Math.max(1, attackStat);
  defenseStat = Math.max(1, defenseStat);

  // Simplified damage formula (similar to main series games)
  const damage = Math.floor(
    (((2 * level / 5 + 2) * move.power * attackStat / defenseStat) / 50) + 2
  );

  return Math.max(1, damage); // Ensure minimum damage is 1
}
