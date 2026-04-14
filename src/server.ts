// backend/src/server.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  InterServerEvents, 
  SocketData, 
  CraftResult 
} from './socket/events.ts';
import type { 
  CraftedItem, 
  ItemBase, 
  PlayerInventory,
  CraftRequest 
} from '../src/types/game.ts';
import { getAvailableBases, craftItem } from './services/itemService.ts';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

// ✅ Now CraftedItem is recognized here
const inventories = new Map<string, { items: CraftedItem[] }>();

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.emit('bases:available', getAvailableBases());

  socket.on('player:connect', (playerId: string) => {
    socket.data.playerId = playerId;
    if (!inventories.has(playerId)) {
      inventories.set(playerId, { items: [] });
    }
  });

  socket.on('craft:request', async (data: CraftRequest, callback: (result: CraftResult) => void) => {
    try {
      const craftResult = craftItem({ 
        baseId: data.baseId, 
        craftType: data.craftType,
        currentItem: data.currentItem 
      });
      
      if (craftResult.success) {
        const response: CraftResult = {
          success: true,
          item: craftResult.item,
          message: data.craftType === 'add_mod' ? 'Mod added successfully!' : 'Item rolled!'
        };
        callback(response);
        socket.emit('craft:result', response);
      } else {
        callback({ success: false, message: craftResult.reason });
      }
    } catch (err) {
      console.error('Craft error:', err);
      callback({ success: false, message: 'Server error during crafting' });
    }
  });

  socket.on('inventory:save', (item: CraftedItem, callback: (success: boolean) => void) => {
    const playerId = socket.data.playerId;
    if (!playerId) {
      callback(false);
      return;
    }
    
    const inv = inventories.get(playerId);
    if (inv && inv.items.length < 20) {
      inv.items.push(item);
      const inventory: PlayerInventory = { 
        playerId, 
        items: inv.items, 
        maxSlots: 20 
      };
      socket.emit('inventory:updated', inventory);
      callback(true);
    } else {
      callback(false);
    }
  });

  socket.on('inventory:get', (callback: (inventory: PlayerInventory) => void) => {
    const playerId = socket.data.playerId || '';
    const inv = inventories.get(playerId);
    callback({ 
      playerId, 
      items: inv?.items || [], 
      maxSlots: 20 
    });
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🎮 Backend running on port ${PORT}`);
});