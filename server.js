const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

let waitingClients = [];
let waitingCounselors = [];

function cancelWaiting(socket) {
  waitingClients = waitingClients.filter(s => s.id !== socket.id);
  waitingCounselors = waitingCounselors.filter(s => s.id !== socket.id);
}

function tryMatch() {
  while (waitingClients.length > 0 && waitingCounselors.length > 0) {
    const client = waitingClients.shift();
    const counselor = waitingCounselors.shift();

    // 念のための安全装置
    if (!client || !counselor) continue;
    if (client.id === counselor.id) {
      // 自己マッチ防止：列に戻す
      waitingClients.push(client);
      continue;
    }

    client.partner = counselor;
    counselor.partner = client;

    client.emit("matched", {
      role: "相談者",
      partnerRole: "相談員"
    });

    counselor.emit("matched", {
      role: "相談員",
      partnerRole: "相談者"
    });

    return; // 1組マッチしたら終了
  }
}

io.on("connection", (socket) => {
  console.log("接続:", socket.id);

  socket.role = null;
  socket.partner = null;
  socket.name = "匿名";

  socket.on("setName", (name) => {
    socket.name = name || "匿名";
  });

  socket.on("selectRole", (role) => {
    cancelWaiting(socket);

    socket.role = role;

    if (role === "client") {
      waitingClients.push(socket);
    } else if (role === "counselor") {
      waitingCounselors.push(socket);
    }

    tryMatch();
  });

  socket.on("message", (msg) => {
    if (socket.partner) {
      socket.partner.emit("message", {
        from: socket.role,
        name: socket.name,
        text: msg
      });
    }
  });

  socket.on("disconnectChat", () => {
    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
    }
    socket.partner = null;
    cancelWaiting(socket);
  });

  socket.on("disconnect", () => {
    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
    }
    cancelWaiting(socket);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
