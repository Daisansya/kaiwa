const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

let waitingCounselor = null;
let waitingClient = null;

io.on("connection", (socket) => {

  socket.on("selectRole", ({ role, name }) => {
    socket.role = role;
    socket.name = name || "匿名";

    if (socket.matched) return;

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

  socket.on("chat", (msg) => {
    socket.broadcast.emit("chat", {
      role: socket.role,
      name: socket.name,
      message: msg
    });
  });

  socket.on("disconnect", () => {
    if (waitingCounselor === socket) waitingCounselor = null;
    if (waitingClient === socket) waitingClient = null;
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
