const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    servidor: "NODE-A"
  });
});

app.get("/livros", (req, res) => {
  const caminho = path.join(__dirname, "livros.json");
  const dados = fs.readFileSync(caminho, "utf-8");
  const livros = JSON.parse(dados);

  res.json(livros);
});

app.get("/agregador/todos", async (req, res) => {
  try {
    const [respostaA, respostaB] = await Promise.all([
      fetch("http://127.0.0.1:3000/livros"),
      fetch("http://192.168.56.108:3000/livros")
    ]);

    const livrosA = await respostaA.json();
    const livrosB = await respostaB.json();

    const todosLivros = [...livrosA, ...livrosB];

    res.json(todosLivros);
  } catch (erro) {
    res.status(500).json({
      erro: "Não foi possível consultar os dois servidores."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`NODE-A rodando na porta ${PORT}`);
});
