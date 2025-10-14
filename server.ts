
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
  const userSockets = new Map<number, string>();
  battleManager.setIo(io);
  battleManager.setUserSockets(userSockets);

  io.on('connection', (socket) => {
    console.log('A user connected', socket.id);

    socket.on('registerUser', (userId: number) => {
      console.log(`[SOCKET] Registering user ${userId} with socket ${socket.id}`);
      userSockets.set(userId, socket.id);
      console.log(`[SOCKET] Current userSockets map:`, Array.from(userSockets.entries()));
    });

    socket.on('challenge', ({ toUserId, from, battleId }) => {
      console.log(`[SOCKET] Challenge from ${from} to user ${toUserId} for battle ${battleId}`);
      const toSocketId = userSockets.get(toUserId);
      if (toSocketId) {
        console.log(`[SOCKET] Emitting challenge to socket ${toSocketId} for user ${toUserId}`);
        io.to(toSocketId).emit('challenge', { from, battleId });
      } else {
        console.log(`[SOCKET] User ${toUserId} not found in userSockets map.`);
      }
    });

    socket.on('disconnect', () => {
      console.log('[SOCKET] User disconnected', socket.id);
      // Remove user from map on disconnect
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          console.log(`[SOCKET] User ${userId} removed from userSockets map.`);
          break;
        }
      }
      console.log(`[SOCKET] Current userSockets map:`, Array.from(userSockets.entries()));
    });

    socket.on('joinBattle', (battleId: string, teamId: string) => {
      console.log(`[SOCKET] User ${socket.id} is joining battle ${battleId} as team ${teamId}`);
      battleManager.handlePlayerJoin(parseInt(battleId, 10), parseInt(teamId, 10), socket.id);
    });

    socket.on('selectMove', (battleId: string, move: string) => {
      console.log(`[SOCKET] User ${socket.id} selected move ${move} in battle ${battleId}`);
      battleManager.selectMove(parseInt(battleId, 10), socket.id, move);
    });

    socket.on('switchPokemon', (battleId: string, pokemonId: number) => {
      console.log(`[SOCKET] User ${socket.id} switched to pokemon ${pokemonId} in battle ${battleId}`);
      battleManager.switchPokemon(parseInt(battleId, 10), socket.id, pokemonId);
    });
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
