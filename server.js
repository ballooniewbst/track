const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve the front-end files that sit next to this file
app.use(express.static(__dirname, { index: "index.html", extensions: ["html"] }));

// rooms: Map<roomCode, Map<ws, member>>
// Everything lives in memory only. Nothing is written to disk or a database.
const rooms = new Map();
let nextId = 1;

const clean = (s, max) =>
  String(s || "").replace(/[^\p{L}\p{N} _.-]/gu, "").trim().slice(0, max);

function broadcast(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const members = [...room.values()];

  for (const [ws, me] of room) {
    if (ws.readyState !== ws.OPEN) continue;
    const payload = members.map((m) => {
      const entry = { id: m.id, name: m.name, sharing: m.sharing, you: m === me };
      // Reciprocity: you only receive locations while you are sharing yours.
      if (m.sharing && me.sharing && m.pos) entry.pos = m.pos;
      return entry;
    });
    ws.send(JSON.stringify({ type: "state", members: payload }));
  }
}

wss.on("connection", (ws) => {
  let roomCode = null;
  let me = null;
  let lastMsg = 0;

  ws.on("message", (raw) => {
    // basic rate limit
    const now = Date.now();
    if (now - lastMsg < 250) return;
    lastMsg = now;

    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === "join" && !me) {
      const name = clean(msg.name, 24);
      const code = clean(msg.room, 32).toLowerCase();
      if (!name || !code) {
        ws.send(JSON.stringify({ type: "error", message: "Name and room code are required." }));
        return;
      }
      roomCode = code;
      me = { id: nextId++, name, sharing: false, pos: null };
      if (!rooms.has(code)) rooms.set(code, new Map());
      const room = rooms.get(code);
      if (room.size >= 20) {
        ws.send(JSON.stringify({ type: "error", message: "This room is full." }));
        me = null;
        return;
      }
      room.set(ws, me);
      ws.send(JSON.stringify({ type: "joined", room: code, name }));
      broadcast(code);
      return;
    }

    if (!me) return;

    if (msg.type === "location") {
      const lat = Number(msg.lat), lng = Number(msg.lng), acc = Number(msg.acc) || 0;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
      me.sharing = true;
      me.pos = { lat, lng, acc, t: now };
      broadcast(roomCode);
    }

    if (msg.type === "stop") {
      me.sharing = false;
      me.pos = null; // location is discarded immediately
      broadcast(roomCode);
    }
  });

  ws.on("close", () => {
    if (!roomCode || !rooms.has(roomCode)) return;
    const room = rooms.get(roomCode);
    room.delete(ws);
    if (room.size === 0) rooms.delete(roomCode);
    else broadcast(roomCode);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Radar Meetup running on http://localhost:${PORT}`));
