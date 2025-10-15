import { Server as SocketIOServer } from 'socket.io';
import prisma from './prisma';
import { Pokemon, Move, calculateDamage } from './battle';
import { Prisma, BattleStatus } from '@prisma/client';

declare global {
  var battleManager: BattleManager | undefined;
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
  winnerId: number | null; // New field for winner
  leagueId: number; // Add leagueId to BattleState
}

class BattleManager {
  private battles: Map<number, BattleState>;
  public io: SocketIOServer | null = null; // Initialize as null
  public userSockets: Map<number, string> | null = null;

  constructor() {
    this.battles = new Map<number, BattleState>();
    console.log('BattleManager constructor called');
  }

  public setIo(io: SocketIOServer): void {
    this.io = io;
  }

  public setUserSockets(userSockets: Map<number, string>): void {
    this.userSockets = userSockets;
  }

  public challengePlayer(toUserId: number, from: string, battleId: number) {
    if (!this.io || !this.userSockets) {
      console.error('[BattleManager] IO or userSockets not set!');
      return;
    }

    const toSocketId = this.userSockets.get(toUserId);
    if (toSocketId) {
      this.io.to(toSocketId).emit('challenge', { from, battleId });
      console.log(`[BattleManager.challenge] Emitted challenge to user ${toUserId} on socket ${toSocketId}`);
    } else {
      console.log(`[BattleManager.challenge] User ${toUserId} not connected.`);
    }
  }

  public async handlePlayerJoin(battleId: number, teamId: number, socketId: string) {
    if (!this.io) {
      console.error('[BattleManager] IO not set!');
      return;
    }

    try {
      const battleState = await this.getBattle(battleId);
      
      if (battleState.players[teamId]) {
        battleState.players[teamId].socketId = socketId;
        console.log(`[BattleManager.join] Player with teamId ${teamId} joined battle ${battleId} with socket ${socketId}`);
      } else {
        console.error(`[BattleManager.join] TeamId ${teamId} not found in battle ${battleId}`);
        return;
      }

      // Send the full state to the player who just joined
      this.io.to(socketId).emit('updateState', battleState);
      console.log(`[BattleManager.join] Sent initial state to player with teamId ${teamId}`);

      // Notify the other player that their opponent has connected
      const opponent = Object.values(battleState.players).find(p => p.teamId !== teamId);
      if (opponent && opponent.socketId) {
        this.io.to(opponent.socketId).emit('updateState', battleState);
        console.log(`[BattleManager.join] Sent update to opponent with teamId ${opponent.teamId}`);
      }

    } catch (error) {
      console.error(`[BattleManager.join] Error handling player join for battle ${battleId}:`, error);
      // Optionally, emit an error back to the client
      this.io.to(socketId).emit('battleError', 'Failed to join battle.');
    }
  }

  public async acceptBattle(battleId: number): Promise<void> {
    if (!this.io || !this.userSockets) {
      console.error('[BattleManager] IO or userSockets not set!');
      return;
    }

    const battle = await prisma.battle.update({
      where: { id: battleId },
      data: { status: 'IN_PROGRESS' },
      include: {
        trainerA: { include: { user: true } },
        trainerB: { include: { user: true } },
      },
    });

    if (!battle) {
      throw new Error('Battle not found');
    }

    const userAId = battle.trainerA.userId;
    const userBId = battle.trainerB.userId;
    const teamAId = battle.trainerAId;
    const teamBId = battle.trainerBId;

    const socketAId = this.userSockets.get(userAId);
    const socketBId = this.userSockets.get(userBId);

    console.log(`[BattleManager.accept] Notifying users ${userAId} and ${userBId}`);

    if (socketAId) {
      this.io.to(socketAId).emit('battleAccepted', { battleId, myTeamId: teamAId });
      console.log(`[BattleManager.accept] Emitted to User A (${userAId}) on socket ${socketAId}`);
    } else {
      console.log(`[BattleManager.accept] User A (${userAId}) not connected.`);
    }

    if (socketBId) {
      this.io.to(socketBId).emit('battleAccepted', { battleId, myTeamId: teamBId });
      console.log(`[BattleManager.accept] Emitted to User B (${userBId}) on socket ${socketBId}`);
    } else {
      console.log(`[BattleManager.accept] User B (${userBId}) not connected.`);
    }
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
      winnerId: battle.winnerId || null, // Initialize winnerId
      leagueId: battle.leagueId, // Populate leagueId
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
        winnerId: battleState.winnerId, // Save winnerId
      },
    });
  }

  private checkAllPokemonFainted(player: PlayerBattleState): boolean {
    return player.team.every(p => p.currentHp <= 0);
  }

  private async handleBattleEnd(battleId: number, winnerTeamId: number, loserTeamId: number, battleState: BattleState): Promise<void> {
    battleState.status = 'COMPLETED';
    battleState.winnerId = winnerTeamId;
    battleState.log.push(`¡Combate finalizado! El equipo ${winnerTeamId} ha ganado.`);

    // Update points in DB
    await prisma.team.update({
      where: { id: winnerTeamId },
      data: { points: { increment: 1 } },
    });

    // Save final battle state
    await this.saveBattle(battleId, battleState);

    // Emit battleEnded event to both players
    for (const player of Object.values(battleState.players)) {
      if (player.socketId) {
        console.log(`[BattleManager] Emitting battleEnded to team ${player.teamId} on socket ${player.socketId}`);
        this.io?.to(player.socketId).emit('battleEnded', {
          winnerId: winnerTeamId,
          loserId: loserTeamId,
          message: `¡Combate finalizado! El equipo ${winnerTeamId} ha ganado.`,
        });
      }
    }
    console.log(`[BattleManager] Battle ${battleId} ended. Winner: ${winnerTeamId}`);
    this.battles.delete(battleId); // Remove battle from memory
  }

  private async executeTurn(battleId: number): Promise<void> {
    const battle = this.battles.get(battleId);
    if (!battle) return;

    // Find the players based on whose turn it is.
    const player1 = Object.values(battle.players).find(p => p.teamId === battle.turn);
    const player2 = Object.values(battle.players).find(p => p.teamId !== battle.turn);

    if (!player1 || !player2 || !player1.selectedMove || !player2.selectedMove) {
      console.error('[BattleManager] executeTurn called with incomplete state.');
      return;
    }

    // Determine attack order by speed
    const fasterPlayer = player1.activePokemon.speed >= player2.activePokemon.speed ? player1 : player2;
    const slowerPlayer = fasterPlayer === player1 ? player2 : player1;

    const fasterMove = fasterPlayer.activePokemon.moves.find(m => m.name === fasterPlayer.selectedMove)!;
    const slowerMove = slowerPlayer.activePokemon.moves.find(m => m.name === slowerPlayer.selectedMove)!;

    // 1. Faster player attacks
    let damage = calculateDamage(fasterPlayer.activePokemon, slowerPlayer.activePokemon, fasterMove);
    slowerPlayer.activePokemon.currentHp -= damage;
    battle.log.push(`${fasterPlayer.activePokemon.name} used ${fasterMove.name} and dealt ${damage} damage to ${slowerPlayer.activePokemon.name}.`);

    // Check if slower player fainted
    if (slowerPlayer.activePokemon.currentHp <= 0) {
      slowerPlayer.activePokemon.currentHp = 0;
      battle.log.push(`${slowerPlayer.activePokemon.name} has fainted!`);
      // Check for battle end
      if (this.checkAllPokemonFainted(slowerPlayer)) {
        await this.handleBattleEnd(battleId, fasterPlayer.teamId, slowerPlayer.teamId, battle);
        return; // Battle ended
      }
    }

    // 2. Slower player attacks (only if still active)
    if (fasterPlayer.activePokemon.currentHp > 0) { // Check if faster player's pokemon is still active
      damage = calculateDamage(slowerPlayer.activePokemon, fasterPlayer.activePokemon, slowerMove);
      fasterPlayer.activePokemon.currentHp -= damage;
      battle.log.push(`${slowerPlayer.activePokemon.name} used ${slowerMove.name} and dealt ${damage} damage to ${fasterPlayer.activePokemon.name}.`);

      if (fasterPlayer.activePokemon.currentHp <= 0) {
        fasterPlayer.activePokemon.currentHp = 0;
        battle.log.push(`${fasterPlayer.activePokemon.name} has fainted!`);
        // Check for battle end
        if (this.checkAllPokemonFainted(fasterPlayer)) {
          await this.handleBattleEnd(battleId, slowerPlayer.teamId, fasterPlayer.teamId, battle);
          return; // Battle ended
        }
      }
    }

    // 3. Reset moves and set next turn
    fasterPlayer.selectedMove = null;
    slowerPlayer.selectedMove = null;
    battle.turn = fasterPlayer.teamId; // The player who went first gets to choose their move first next turn
    battle.log.push(`--- End of Turn ---`);
    battle.log.push(`It is now team ${fasterPlayer.teamId}'s turn.`);
  }

  private async broadcastState(battleId: number): Promise<void> {
    if (!this.io) return;

    const battleState = this.battles.get(battleId);
    if (!battleState) return;

    for (const player of Object.values(battleState.players)) {
      if (player.socketId) {
        this.io.to(player.socketId).emit('updateState', battleState);
      }
    }
    console.log(`[BattleManager] Broadcasted state for battle ${battleId}`);
  }

  public async selectMove(battleId: number, socketId: string, move: string): Promise<void> {
    console.log(`[BattleManager] selectMove called for battle ${battleId}, socket ${socketId}, move ${move}.`);
    const battle = this.battles.get(battleId);
    if (!battle || !this.io) return;

    // If battle is already completed, do nothing
    if (battle.status === 'COMPLETED') {
      this.io.to(socketId).emit('battleError', 'Battle is already completed.');
      return;
    }

    const currentPlayerTeamId = Object.values(battle.players).find(p => p.socketId === socketId)?.teamId;
    if (!currentPlayerTeamId) return;

    if (battle.turn !== currentPlayerTeamId) {
      console.log(`[BattleManager] It's not player ${currentPlayerTeamId}'s turn.`);
      this.io.to(socketId).emit('battleError', 'It is not your turn.');
      return;
    }

    const player = battle.players[currentPlayerTeamId];
    // Check if active pokemon is fainted
    if (player.activePokemon.currentHp <= 0) {
      this.io.to(socketId).emit('battleError', 'Your active Pokémon has fainted. You must switch.');
      await this.broadcastState(battleId); // Ensure client knows to switch
      return;
    }
    player.selectedMove = move;
    battle.log.push(`${player.activePokemon.name} selected ${move}.`);

    const opponentTeamId = Object.keys(battle.players).map(Number).find(id => id !== currentPlayerTeamId);
    if (!opponentTeamId) return;

    const opponent = battle.players[opponentTeamId];

    if (opponent.selectedMove) {
      battle.log.push('Both players have selected moves. Executing turn...');
      battle.turnOrder = [battle.turn, opponentTeamId]; // This needs to be based on speed, will fix in executeTurn
      await this.executeTurn(battleId);
      // After turn execution, the turn is switched inside executeTurn or right after
    } else {
      battle.log.push(`Waiting for opponent to select a move...`);
      battle.turn = opponentTeamId; // Switch turn to the other player
    }

    await this.saveBattle(battleId, battle);
    await this.broadcastState(battleId);
  }

  public async switchPokemon(battleId: number, socketId: string, pokemonId: number): Promise<void> {
    const battle = this.battles.get(battleId);
    if (!battle || !this.io) return;

    // If battle is already completed, do nothing
    if (battle.status === 'COMPLETED') {
      this.io.to(socketId).emit('battleError', 'Battle is already completed.');
      return;
    }

    const currentPlayerTeamId = Object.values(battle.players).find(p => p.socketId === socketId)?.teamId;
    if (!currentPlayerTeamId) return;

    if (battle.turn !== currentPlayerTeamId) {
      console.log(`[BattleManager] It's not player ${currentPlayerTeamId}'s turn to switch.`);
      this.io.to(socketId).emit('battleError', 'It is not your turn.');
      return;
    }

    const player = battle.players[currentPlayerTeamId];
    const newPokemon = player.team.find(p => p.id === pokemonId);

    if (!newPokemon) {
      battle.log.push(`${player.activePokemon.name} tried to switch to an unknown Pokémon.`);
      await this.broadcastState(battleId);
      return;
    }

    if (newPokemon.currentHp <= 0) {
      battle.log.push(`${newPokemon.name} has fainted and cannot be switched in!`);
      await this.broadcastState(battleId);
      return;
    }

    // Find the index of the old active pokemon in the team array and update it
    const oldPokemonIndex = player.team.findIndex(p => p.id === player.activePokemon.id);
    if (oldPokemonIndex !== -1) {
      player.team[oldPokemonIndex] = player.activePokemon;
    }

    const oldPokemonName = player.activePokemon ? player.activePokemon.name : "their team";
    player.activePokemon = newPokemon;
    player.maxHp = newPokemon.hp;
    battle.log.push(`Player ${player.teamId} switched from ${oldPokemonName} to ${newPokemon.name}!`);

    // Check if the player has any non-fainted pokemon left after switch (relevant if forced switch)
    if (player.activePokemon.currentHp <= 0 && this.checkAllPokemonFainted(player)) {
      const opponentTeamId = Object.keys(battle.players).map(Number).find(id => id !== currentPlayerTeamId)!;
      await this.handleBattleEnd(battleId, opponentTeamId, currentPlayerTeamId, battle);
      return; // Battle ended
    }

    // Switch turn to the other player
    const opponentTeamId = Object.keys(battle.players).map(Number).find(id => id !== currentPlayerTeamId);
    if (opponentTeamId) {
      battle.turn = opponentTeamId;
      battle.log.push(`It is now team ${opponentTeamId}'s turn.`);
    }

    await this.saveBattle(battleId, battle);
    await this.broadcastState(battleId);
  }
}

export const battleManager = 
  globalThis.battleManager || new BattleManager();

if (process.env.NODE_ENV !== 'production') {
  globalThis.battleManager = battleManager;
}