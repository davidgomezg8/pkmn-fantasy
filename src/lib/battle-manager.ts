
import prisma from './prisma';
import { Pokemon, Move } from './battle';
import { Prisma } from '@prisma/client';

declare global {
  var battleManagerInstance: BattleManager;
}

// Define a type that includes the 'moves' property
type PokemonWithMoves = Pokemon & { moves: Move[] };

interface PlayerBattleState {
  socketId: string | null;
  teamId: number;
  activePokemon: Pokemon;
  team: Pokemon[];
  maxHp: number; // Initial HP of the active Pokemon
}

interface BattleState {
  battleId: number;
  players: {
    [teamId: number]: PlayerBattleState;
  };
  turn: number; // teamId of the player whose turn it is
  log: string[];
}

class BattleManager {
  private battles: Map<number, BattleState> = new Map();

  private constructor() {}

  public static getInstance(): BattleManager {
    if (!globalThis.battleManagerInstance) {
      globalThis.battleManagerInstance = new BattleManager();
    }
    return globalThis.battleManagerInstance;
  }

  public async getBattle(battleId: number): Promise<BattleState> {
    console.log(`[BattleManager] getBattle called for battle ${battleId}. Current battles map size: ${this.battles.size}`);
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        trainerA: { include: { user: true, pokemons: true } },
        trainerB: { include: { user: true, pokemons: true } },
      },
    }) as (Prisma.BattleGetPayload<{
      include: {
        trainerA: { include: { user: true, pokemons: true } };
        trainerB: { include: { user: true, pokemons: true } };
      };
    }> & {
      trainerA: { pokemons: PokemonWithMoves[] };
      trainerB: { pokemons: PokemonWithMoves[] };
    });

    if (!battle) {
      console.log(`[BattleManager] Battle ${battleId} not found in DB.`);
      throw new Error('Batalla no encontrada');
    }

    // Explicitly cast moves from Prisma.JsonValue to Move[]
    const trainerAPokemons: PokemonWithMoves[] = battle.trainerA.pokemons.map((p: Pokemon) => ({
      ...p,
      moves: (p.moves || []) as Move[],
    }));
    const trainerBPokemons: PokemonWithMoves[] = battle.trainerB.pokemons.map((p: Pokemon) => ({
      ...p,
      moves: (p.moves || []) as Move[],
    }));

    const battleState: BattleState = {
      battleId,
      players: {
        [battle.trainerAId]: {
          socketId: null,
          teamId: battle.trainerAId,
          activePokemon: trainerAPokemons.sort((a: Pokemon, b: Pokemon) => a.order - b.order)[0],
          team: trainerAPokemons,
          maxHp: trainerAPokemons.sort((a: Pokemon, b: Pokemon) => a.order - b.order)[0].hp,
        },
        [battle.trainerBId]: {
          socketId: null,
          teamId: battle.trainerBId,
          activePokemon: trainerBPokemons.sort((a: Pokemon, b: Pokemon) => a.order - b.order)[0],
          team: trainerBPokemons,
          maxHp: trainerBPokemons.sort((a: Pokemon, b: Pokemon) => a.order - b.order)[0].hp,
        },
      },
      turn: battle.trainerAId, // Trainer A starts
      log: [],
    };

    this.battles.set(battleId, battleState);
    console.log(`[BattleManager] Battle ${battleId} added to map. New map size: ${this.battles.size}`);
    return battleState;
  }

  public addPlayer(battleId: number, socketId: string, teamId: number) {
    const battle = this.battles.get(battleId);
    if (battle && battle.players[teamId]) {
      battle.players[teamId].socketId = socketId;
      console.log(`[BattleManager] Player ${teamId} added to battle ${battleId}. Socket ID: ${socketId}`);
    }
  }

  public selectMove(battleId: number, socketId: string, move: string): BattleState | null {
    console.log(`[BattleManager] selectMove called for battle ${battleId}, socket ${socketId}, move ${move}. Current battles map size: ${this.battles.size}`);
    const battle = this.battles.get(battleId);
    if (!battle) {
      console.log(`[BattleManager] Battle ${battleId} not found in map for selectMove.`);
      return null;
    }

    const currentPlayerTeamId = Object.values(battle.players).find(p => p.socketId === socketId)?.teamId;
    if (!currentPlayerTeamId || battle.turn !== currentPlayerTeamId) {
      return null;
    }

    const player = battle.players[currentPlayerTeamId];
    const opponentTeamId = Object.keys(battle.players).map(Number).find(id => id !== currentPlayerTeamId);
    if (!opponentTeamId) return null;

    const opponent = battle.players[opponentTeamId];

    const selectedMove = player.activePokemon.moves.find(m => m.name === move);
    if (!selectedMove) {
      battle.log.push(`${player.activePokemon.name} tried to use an unknown move: ${move}`);
      return battle;
    }

    // Simple damage calculation using move power
    const damage = selectedMove.power;
    opponent.activePokemon.hp -= damage;

    battle.log.push(`${player.activePokemon.name} used ${selectedMove.name} and dealt ${damage} damage to ${opponent.activePokemon.name}`);

    if (opponent.activePokemon.hp <= 0) {
      battle.log.push(`${opponent.activePokemon.name} has fainted!`);
      // Handle fainting logic here (e.g., switch to next pokemon)
    }

    battle.turn = opponentTeamId;
    return battle;
  }

  public switchPokemon(battleId: number, socketId: string, pokemonId: number): BattleState | null {
    console.log(`[BattleManager] switchPokemon called for battle ${battleId}, socket ${socketId}, pokemon ${pokemonId}. Current battles map size: ${this.battles.size}`);
    const battle = this.battles.get(battleId);
    if (!battle) {
      console.log(`[BattleManager] Battle ${battleId} not found in map for switchPokemon.`);
      return null;
    }

    const currentPlayerTeamId = Object.values(battle.players).find(p => p.socketId === socketId)?.teamId;
    if (!currentPlayerTeamId) {
      console.log(`[BattleManager] Current player team ID not found for socket ${socketId}.`);
      return null;
    }

    const player = battle.players[currentPlayerTeamId];
    const newPokemon = player.team.find(p => p.id === pokemonId);

    if (!newPokemon) {
      battle.log.push(`${player.activePokemon.name} tried to switch to an unknown Pokémon.`);
      console.log(`[BattleManager] Unknown Pokémon ${pokemonId} for player ${currentPlayerTeamId}.`);
      return battle;
    }

    if (newPokemon.hp <= 0) {
      battle.log.push(`${newPokemon.name} has fainted and cannot be switched in!`);
      console.log(`[BattleManager] Pokémon ${newPokemon.name} has fainted.`);
      return battle;
    }

    player.activePokemon = newPokemon;
    player.maxHp = newPokemon.hp; // Update maxHp for the new active Pokemon
    battle.log.push(`${player.activePokemon.name} switched to ${newPokemon.name}!`);
    console.log(`[BattleManager] Player ${currentPlayerTeamId} switched active Pokemon to ${newPokemon.name}. New activePokemon:`, player.activePokemon);
    console.log(`[BattleManager] Player ${currentPlayerTeamId} new maxHp:`, player.maxHp);

    // Turn does not change after a switch
    return battle;
  }
}

export const battleManager = BattleManager.getInstance();
