
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { battleManager } from './src/lib/battle-manager';
import prisma from './src/lib/prisma';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server);

  io.on('connection', (socket) => {
    console.log('A user connected', socket.id);

    socket.on('joinBattle', async (battleId: string, teamId: string) => {
      console.log(`Socket ${socket.id} joining battle ${battleId}`);
      const parsedBattleId = parseInt(battleId, 10);
      const parsedTeamId = parseInt(teamId, 10);
      const battle = await battleManager.getBattle(parsedBattleId);
      // This is a placeholder for getting the team from the database
      const team = await prisma.team.findUnique({ where: { id: parsedTeamId }, include: { pokemons: true } });
      if (team) {
        battleManager.addPlayer(parsedBattleId, socket.id, parsedTeamId);
        socket.join(parsedBattleId.toString());
        io.to(parsedBattleId.toString()).emit('updateState', battle);
      }
    });

    socket.on('selectMove', (battleId: number, move: string) => {
      console.log(`Socket ${socket.id} selected move ${move} in battle ${battleId}`);
      const battle = battleManager.selectMove(battleId, socket.id, move);
      if (battle) {
        io.to(battleId.toString()).emit('updateState', battle);
      }
    });

    socket.on('switchPokemon', (battleId: string, pokemonId: number) => {
      const parsedBattleId = parseInt(battleId, 10);
      console.log(`[Server] Socket ${socket.id} received switchPokemon event for battle ${parsedBattleId}, pokemon ${pokemonId}`);
      const battle = battleManager.switchPokemon(parsedBattleId, socket.id, pokemonId);
      if (battle) {
        console.log(`[Server] Battle state after switchPokemon:`, battle);
        io.to(parsedBattleId.toString()).emit('updateState', battle);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected', socket.id);
    });
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
