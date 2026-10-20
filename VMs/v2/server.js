const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    servidor: "NODE-B"
  });
});

app.get("/livros", (req, res) => {
  const caminho = path.join(__dirname, "livros.json");
  const dados = fs.readFileSync(caminho, "utf-8");
  const livros = JSON.parse(dados);

  res.json(livros);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`NODE-B rodando na porta ${PORT}`);
});