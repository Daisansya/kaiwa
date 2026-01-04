const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let waiting = {
  counselor: new Set(),
  client: new Set(),
};

let pairs = new Map(); // socket.id -> partner.id

function broadcastStatus() {
  io.emit("statusUpdate", {
    total: io.engine.clientsCount,
    waitingCounselor: waiting.counselor.size,
    waitingClient: waiting.client.size,
  });
}

io.on("connection", (socket) => {
  console.log("connected:", socket.id);
  broadcastStatus();

  socket.on("selectRole", ({ role, name }) => {
    socket.role = role;
    socket.name = (name || "匿名").slice(0, 30); // ★ 30文字制限

    const opposite = role === "counselor" ? "client" : "counselor";

    if (waiting[opposite].size > 0) {
      const partner = waiting[opposite].values().next().value;
      waiting[opposite].delete(partner);

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
      waiting[role].add(socket);
      socket.emit("waiting");
    }

    broadcastStatus();
  });

  socket.on("cancelWaiting", () => {
    if (socket.role && waiting[socket.role]) {
      waiting[socket.role].delete(socket);
    }
    socket.emit("waitingCanceled");
    broadcastStatus();
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

    if (socket.role && waiting[socket.role]) {
      waiting[socket.role].delete(socket);
    }

    broadcastStatus();
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
