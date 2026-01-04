const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

let waiting = null;

io.on("connection", (socket) => {
  socket.on("join", (data) => {
    socket.role = data.role;
    socket.name = data.name;

    if (waiting === null) {
      waiting = socket;
    } else {
      const partner = waiting;
      waiting = null;

      socket.partner = partner;
      partner.partner = socket;

      socket.emit("matched", {
        role: partner.role,
        name: partner.name,
      });

      partner.emit("matched", {
        role: socket.role,
        name: socket.name,
      });
    }
  });

  socket.on("message", (text) => {
    if (socket.partner) {
      socket.emit("message", {
        text,
        role: socket.role,
        name: socket.name,
        self: true,
      });

      socket.partner.emit("message", {
        text,
        role: socket.role,
        name: socket.name,
        self: false,
      });
    }
  });

  socket.on("disconnect", () => {
    if (waiting === socket) {
      waiting = null;
    }
    if (socket.partner) {
      socket.partner.emit("disconnected");
      socket.partner.partner = null;
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
