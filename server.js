const express = require("express");
const path = require("path");

const app = express();

// Render / ローカル両対応のポート
const PORT = process.env.PORT || 3000;

// 静的ファイル（index.html, JS, CSS）を配信
app.use(express.static(__dirname));

// トップページ
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
