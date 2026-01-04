const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let waitingCounselor = null;
let waitingClient = null;

io.on("connection", (socket) => {
  console.log("接続:", socket.id);

  socket.on("selectRole", ({ role, name }) => {
    socket.role = role;
    socket.name = name;

    if (role === "counselor") {
      waitingCounselor = socket;
    } else {
      waitingClient = socket;
    }

    if (waitingCounselor && waitingClient) {
      waitingCounselor.emit("matched", {
        partnerRole: "相談者",
        partnerName: waitingClient.name,
      });
      waitingClient.emit("matched", {
        partnerRole: "相談員",
        partnerName: waitingCounselor.name,
      });

      waitingCounselor = null;
      waitingClient = null;
    } else {
      socket.emit("waiting");
    }
  });

  socket.on("disconnectChat", () => {
    socket.role = null;
    socket.name = null;
    socket.emit("reset");
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
