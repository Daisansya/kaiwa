const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let waitingConsultant = null;
let waitingClient = null;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

io.on("connection", (socket) => {
  console.log("接続:", socket.id);

  socket.on("selectRole", (role) => {
    socket.role = role;

    if (role === "consultant") {
      waitingConsultant = socket;
    } else {
      waitingClient = socket;
    }

    if (waitingConsultant && waitingClient) {
      waitingConsultant.emit("matched");
      waitingClient.emit("matched");

      waitingConsultant.partner = waitingClient;
      waitingClient.partner = waitingConsultant;

      waitingConsultant = null;
      waitingClient = null;
    }
  });

  socket.on("message", (msg) => {
    if (socket.partner) {
      socket.partner.emit("message", msg);
    }
  });

  socket.on("disconnect", () => {
    if (waitingConsultant === socket) waitingConsultant = null;
    if (waitingClient === socket) waitingClient = null;
  });
});

server.listen(3000, () => {
  console.log("サーバー起動：http://localhost:3000");
});