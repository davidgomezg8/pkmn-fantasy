import { Server as SocketIOServer } from 'socket.io';
import prisma from './prisma';
import { Pokemon, Move, calculateDamage } from './battle';
import { Prisma, BattleStatus } from '@prisma/client';

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
  selectedMove: string | null;
}

interface BattleState {
  battleId: number;
  players: {
    [teamId: number]: PlayerBattleState;
  };
  turn: number; // teamId of the player whose turn it is
  log: string[];
  status: BattleStatus; // Current status of the battle
  turnOrder: number[]; // Array of teamIds in turn order
}

class BattleManager {
  private static instance: BattleManager;
  private battles: Map<number, BattleState>;
  private io: SocketIOServer | null = null; // Initialize as null

  private constructor() {
    this.battles = new Map<number, BattleState>();
    console.log('BattleManager constructor called');
  }

  public static getInstance(): BattleManager {
    if (!BattleManager.instance) {
      BattleManager.instance = new BattleManager();
    }
    return BattleManager.instance;
  }

  public setIo(io: SocketIOServer): void {
    this.io = io;
  }

  public async getBattle(battleId: number): Promise<BattleState> {
    console.log(`[BattleManager] getBattle called for battle ${battleId}. Current battles map size: ${this.battles.size}`);
    
    // If battle is already in memory, return it
    if (this.battles.has(battleId)) {
      return this.battles.get(battleId)!;
    }

    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        trainerA: { include: { user: true, pokemons: { orderBy: { order: 'asc' } } } },
        trainerB: { include: { user: true, pokemons: { orderBy: { order: 'asc' } } } },
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
      currentHp: p.hp,
    }));
    console.log('[BattleManager] trainerAPokemons[0].name:', trainerAPokemons[0]?.name);

    const trainerBPokemons: PokemonWithMoves[] = battle.trainerB.pokemons.map((p: Pokemon) => ({
      ...p,
      moves: (p.moves || []) as Move[],
      currentHp: p.hp,
    }));

    const initialPokemonA =
      battle.pokemonAState && Object.keys(battle.pokemonAState).length > 0
        ? (battle.pokemonAState as unknown as Pokemon)
        : { ...trainerAPokemons[0] };
    console.log('[BattleManager] initialPokemonA (raw):', initialPokemonA);
    console.log('[BattleManager] initialPokemonA (stringified):', JSON.stringify(initialPokemonA, null, 2));

    const activePokemonA = {
      ...initialPokemonA,
      currentHp: initialPokemonA.currentHp || initialPokemonA.hp,
    };

    const initialPokemonB =
      battle.pokemonBState && Object.keys(battle.pokemonBState).length > 0
        ? (battle.pokemonBState as unknown as Pokemon)
        : { ...trainerBPokemons[0] };
    const activePokemonB = {
      ...initialPokemonB,
      currentHp: initialPokemonB.currentHp || initialPokemonB.hp,
    };

    const battleState: BattleState = {
      battleId,
      players: {
        [battle.trainerAId]: {
          socketId: null,
          teamId: battle.trainerAId,
          activePokemon: activePokemonA,
          team: trainerAPokemons,
          maxHp: activePokemonA.hp,
          selectedMove: null,
        },
        [battle.trainerBId]: {
          socketId: null,
          teamId: battle.trainerBId,
          activePokemon: activePokemonB,
          team: trainerBPokemons,
          maxHp: activePokemonB.hp,
          selectedMove: null,
        },
      },
      turn: battle.currentTurn || battle.trainerAId, // Use currentTurn from DB, or Trainer A starts
      log: (battle.log as unknown as string[]) || [],
      status: battle.status || 'PENDING',
      turnOrder: (battle.turnOrder as unknown as number[]) || [],
    };

    this.battles.set(battleId, battleState);
    console.log(`[BattleManager] Battle ${battleId} added to map. New map size: ${this.battles.size}`);
    console.log('[BattleManager] Initial battle state:', JSON.stringify(battleState, null, 2));
    return battleState;
  }

  public addPlayer(battleId: number, socketId: string, teamId: number) {
    const battle = this.battles.get(battleId);
    if (battle && battle.players[teamId]) {
      battle.players[teamId].socketId = socketId;
      console.log(`[BattleManager] Player ${teamId} added to battle ${battleId}. Socket ID: ${socketId}`);
    }
  }

  private async saveBattle(battleId: number, battleState: BattleState): Promise<void> {
    const trainerAId = Object.values(battleState.players)[0].teamId;
    const trainerBId = Object.values(battleState.players)[1].teamId;

    await prisma.battle.update({
      where: { id: battleId },
      data: {
        log: battleState.log as Prisma.JsonArray,
        pokemonAState: battleState.players[trainerAId].activePokemon as unknown as Prisma.JsonObject,
        pokemonBState: battleState.players[trainerBId].activePokemon as unknown as Prisma.JsonObject,
        currentTurn: battleState.turn,
        status: battleState.status,
        activePokemonAId: battleState.players[trainerAId].activePokemon.id,
        activePokemonBId: battleState.players[trainerBId].activePokemon.id,
        turnOrder: battleState.turnOrder as Prisma.JsonArray,
      },
    });
  }

  private async executeTurn(battleId: number): Promise<void> {
    const battle = this.battles.get(battleId);
    if (!battle) return;

    const player1 = battle.players[battle.turnOrder[0]];
    const player2 = battle.players[battle.turnOrder[1]];

    if (!player1.selectedMove || !player2.selectedMove) {
      return;
    }

    const move1 = player1.activePokemon.moves.find(m => m.name === player1.selectedMove);
    const move2 = player2.activePokemon.moves.find(m => m.name === player2.selectedMove);

    if (!move1 || !move2) {
      return;
    }

    const fasterPlayer = player1.activePokemon.speed >= player2.activePokemon.speed ? player1 : player2;
    const slowerPlayer = fasterPlayer === player1 ? player2 : player1;

    const fasterMove = fasterPlayer.activePokemon.moves.find(m => m.name === fasterPlayer.selectedMove);
    const slowerMove = slowerPlayer.activePokemon.moves.find(m => m.name === slowerPlayer.selectedMove);

    if (!fasterMove || !slowerMove) {
      return;
    }

    // Faster player attacks
    let damage = calculateDamage(fasterPlayer.activePokemon, slowerPlayer.activePokemon, fasterMove);
    slowerPlayer.activePokemon.currentHp -= damage;
    battle.log.push(`${fasterPlayer.activePokemon.name} used ${fasterMove.name} and dealt ${damage} damage to ${slowerPlayer.activePokemon.name}`);

    if (slowerPlayer.activePokemon.currentHp <= 0) {
      slowerPlayer.activePokemon.currentHp = 0;
      battle.log.push(`${slowerPlayer.activePokemon.name} has fainted!`);
    } else {
      // Slower player attacks
      damage = calculateDamage(slowerPlayer.activePokemon, fasterPlayer.activePokemon, slowerMove);
      fasterPlayer.activePokemon.currentHp -= damage;
      battle.log.push(`${slowerPlayer.activePokemon.name} used ${slowerMove.name} and dealt ${damage} damage to ${fasterPlayer.activePokemon.name}`);

      if (fasterPlayer.activePokemon.currentHp <= 0) {
        fasterPlayer.activePokemon.currentHp = 0;
        battle.log.push(`${fasterPlayer.activePokemon.name} has fainted!`);
      }
    }

    player1.selectedMove = null;
    player2.selectedMove = null;

    await this.saveBattle(battleId, battle);
  }

  public async selectMove(battleId: number, socketId: string, move: string): Promise<BattleState | null> {
    console.log(`[BattleManager] selectMove called for battle ${battleId}, socket ${socketId}, move ${move}. Current battles map size: ${this.battles.size}`);
    const battle = this.battles.get(battleId);
    if (!battle) {
      console.log(`[BattleManager] Battle ${battleId} not found in map for selectMove.`);
      return null;
    }

    const currentPlayerTeamId = Object.values(battle.players).find(p => p.socketId === socketId)?.teamId;
    if (!currentPlayerTeamId) {
      return null;
    }

    if (battle.turn !== currentPlayerTeamId) {
      console.log(`[BattleManager] It's not player ${currentPlayerTeamId}'s turn.`);
      // Optionally, emit an error to the client
      if (this.io) {
        this.io.to(socketId).emit('battleError', 'It is not your turn.');
      }
      return battle;
    }

    const player = battle.players[currentPlayerTeamId];
    player.selectedMove = move;
    battle.log.push(`${player.activePokemon.name} selected ${move}`);

    const opponentTeamId = Object.keys(battle.players).map(Number).find(id => id !== currentPlayerTeamId);
    if (!opponentTeamId) return null;

    const opponent = battle.players[opponentTeamId];

    if (opponent.selectedMove) {
      battle.turnOrder = [battle.turn, opponentTeamId];
      await this.executeTurn(battleId);
      battle.turn = opponentTeamId; // Switch turn to the other player
    } else {
      // Waiting for the other player to make a move
      battle.log.push(`Waiting for opponent to select a move...`);
      battle.turn = opponentTeamId; // Switch turn to the other player
    }

    await this.saveBattle(battleId, battle);
    return battle;
  }

  public async switchPokemon(battleId: number, socketId: string, pokemonId: number): Promise<BattleState | null> {
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

    if (newPokemon.currentHp <= 0) {
      battle.log.push(`${newPokemon.name} has fainted and cannot be switched in!`);
      console.log(`[BattleManager] Pokémon ${newPokemon.name} has fainted.`);
      return battle;
    }

    // Find the index of the old active pokemon in the team array and update it
    const oldPokemonIndex = player.team.findIndex(p => p.id === player.activePokemon.id);
    if (oldPokemonIndex !== -1) {
      player.team[oldPokemonIndex] = player.activePokemon;
    }

    const oldPokemonName = player.activePokemon ? player.activePokemon.name : "their team";
    player.activePokemon = newPokemon;
    player.maxHp = newPokemon.hp; // Update maxHp for the new active Pokemon
    battle.log.push(`Player ${player.teamId} switched from ${oldPokemonName} to ${newPokemon.name}!`);
    console.log(`[BattleManager] Player ${currentPlayerTeamId} switched active Pokemon to ${newPokemon.name}. New activePokemon:`, player.activePokemon);
    console.log(`[BattleManager] Player ${currentPlayerTeamId} new maxHp:`, player.maxHp);

    // Turn does not change after a switch
    await this.saveBattle(battleId, battle);
    return battle;
  }
}

export const battleManager = BattleManager.getInstance();