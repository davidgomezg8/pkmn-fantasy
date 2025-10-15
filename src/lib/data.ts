export interface User {
  id: number;
  name: string;
}

export interface League {
  id: number;
  name: string;
  members: User[];
}

// --- DATOS SIMULADOS ---

export const users: User[] = [
  { id: 1, name: 'Ash Ketchum' },
  { id: 2, name: 'Misty' },
  { id: 3, name: 'Brock' },
];

export const leagues: League[] = [
  {
    id: 101,
    name: 'Liga Añil de Kanto',
    members: [users[0]], // Ash ya está en esta liga
  },
  {
    id: 102,
    name: 'Torneo de Campeones de Johto',
    members: [],
  },
  {
    id: 103,
    name: 'Gran Festival de Hoenn',
    members: [],
  },
];
