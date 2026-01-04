const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

// ★ ここが重要
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

let waitingCounselor = null;
let waitingClient = null;

io.on("connection", (socket) => {
socket.on("selectRole", ({ role, name }) => {
  socket.role = role;
  socket.name = name;

  if (role === "counselor") {
    if (waitingCounselor) {
      socket.emit("waiting");
      return;
    }
    waitingCounselor = socket;
  }

  if (role === "client") {
    if (waitingClient) {
      socket.emit("waiting");
      return;
    }
    waitingClient = socket;
  }

  if (waitingCounselor && waitingClient) {
    waitingCounselor.emit("matched", {
      partnerRole: "相談者",
      partnerName: waitingClient.name
    });

    waitingClient.emit("matched", {
      partnerRole: "相談員",
      partnerName: waitingCounselor.name
    });

    waitingCounselor = null;
    waitingClient = null;
  } else {
    socket.emit("waiting");
  }
});

  socket.on("disconnectChat", () => {
    socket.emit("reset");
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});


