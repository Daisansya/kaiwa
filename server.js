const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let waiting = {
  counselor: null,
  client: null,
};

let pairs = new Map();

/* 人数を全員に送る関数 */
function emitCount() {
  const online = io.engine.clientsCount;
  const waitingCount =
    (waiting.counselor ? 1 : 0) + (waiting.client ? 1 : 0);

  io.emit("count", {
    online,
    waiting: waitingCount,
  });
}

io.on("connection", (socket) => {
  emitCount();

  socket.on("selectRole", ({ role, name }) => {
    socket.role = role;
    socket.name = name || "匿名";

    const opposite = role === "counselor" ? "client" : "counselor";

    if (waiting[opposite]) {
      const partner = waiting[opposite];
      waiting[opposite] = null;

      pairs.set(socket.id, partner.id);
      pairs.set(partner.id, socket.id);

      socket.emit("matched", {
        role,
        partnerName: partner.name,
      });

      partner.emit("matched", {
        role: opposite,
        partnerName: socket.name,
      });
    } else {
      waiting[role] = socket;
      socket.emit("waiting");
    }

    emitCount();
  });

  socket.on("cancelWaiting", () => {
    if (waiting[socket.role]?.id === socket.id) {
      waiting[socket.role] = null;
    }
    emitCount();
  });

  socket.on("message", (text) => {
    const partnerId = pairs.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("message", {
        text,
        from: socket.name,
        role: socket.role,
      });
    }
  });

  socket.on("disconnectChat", () => {
    handleDisconnect(socket);
  });

  socket.on("disconnect", () => {
    handleDisconnect(socket);
  });

  function handleDisconnect(socket) {
    const partnerId = pairs.get(socket.id);

    if (partnerId) {
      io.to(partnerId).emit("partnerDisconnected");
      pairs.delete(partnerId);
      pairs.delete(socket.id);
    }

    if (waiting[socket.role]?.id === socket.id) {
      waiting[socket.role] = null;
    }

    emitCount();
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
