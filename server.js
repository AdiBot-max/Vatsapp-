// ===== Cyron-Y Brawl — Multiplayer Server =====
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

let waiting = null;
let rooms = {};
let nextRoom = 1;

io.on("connection", socket => {
  console.log("🟢 Player connected:", socket.id);

  socket.on("joinLobby", playerData => {
    socket.player = playerData;
    if (!waiting) {
      waiting = socket;
      socket.emit("waiting", "Waiting for another player...");
    } else {
      // Start match
      const roomId = "room" + nextRoom++;
      const p1 = waiting;
      const p2 = socket;
      waiting = null;

      rooms[roomId] = [p1, p2];
      p1.join(roomId);
      p2.join(roomId);

      io.to(roomId).emit("startGame", {
        roomId,
        players: [
          { id: p1.id, name: p1.player.name, color: p1.player.color },
          { id: p2.id, name: p2.player.name, color: p2.player.color }
        ]
      });

      console.log(`🎮 Game started in ${roomId}`);
    }
  });

  socket.on("playerState", data => {
    if (!data.roomId) return;
    socket.to(data.roomId).emit("updateState", data);
  });

  socket.on("hit", ({ roomId, targetId, damage }) => {
    socket.to(roomId).emit("hit", { targetId, damage });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Player left:", socket.id);
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(s => s.id !== socket.id);
      io.to(roomId).emit("playerLeft");
      if (rooms[roomId].length === 0) delete rooms[roomId];
    }
    if (waiting && waiting.id === socket.id) waiting = null;
  });
});

httpServer.listen(PORT, () =>
  console.log(`🚀 Cyron-Y Brawl server on http://localhost:${PORT}`)
);
