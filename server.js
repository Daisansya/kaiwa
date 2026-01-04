const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

// ====== 静的ファイル配信 ======
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ====== 待機状態 ======
let waitingCounselor = null;
let waitingClient = null;

// ====== Socket.io ======
io.on("connection", (socket) => {
  console.log("接続:", socket.id);

  socket.on("selectRole", ({ role, name }) => {
    socket.role = role;
    socket.name = name || "匿名";

    console.log(`役割選択: ${role} (${socket.name})`);

    // すでにマッチ中なら無視
    if (socket.matched) return;

    // ---- 相談員 ----
    if (role === "counselor") {
      if (waitingCounselor) {
        socket.emit("waiting");
        return;
      }
      waitingCounselor = socket;
    }

    // ---- 相談者 ----
    if (role === "client") {
      if (waitingClient) {
        socket.emit("waiting");
        return;
      }
      waitingClient = socket;
    }

    // ---- マッチ条件 ----
    if (waitingCounselor && waitingClient) {
      waitingCounselor.matched = true;
      waitingClient.matched = true;

      waitingCounselor.emit("matched", {
        myRole: "相談員",
        myName: waitingCounselor.name,
        partnerRole: "相談者",
        partnerName: waitingClient.name
      });

      waitingClient.emit("matched", {
        myRole: "相談者",
        myName: waitingClient.name,
        partnerRole: "相談員",
        partnerName: waitingCounselor.name
      });

      waitingCounselor = null;
      waitingClient = null;
    } else {
      socket.emit("waiting");
    }
  });

  // ====== チャット ======
  socket.on("chat", (msg) => {
    socket.broadcast.emit("chat", {
      role: socket.role,
      name: socket.name,
      message: msg
    });
  });

  // ====== 切断 ======
  socket.on("disconnect", () => {
    console.log("切断:", socket.id);

    if (waitingCounselor === socket) waitingCounselor = null;
    if (waitingClient === socket) waitingClient = null;
  });
});

// ====== 起動 ======
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
