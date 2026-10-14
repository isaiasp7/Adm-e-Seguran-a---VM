import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";

const nodeABooks = [
  {
    id: "TEC-TEST",
    titulo: "Livro do nó A",
    autor: "Autor A",
    categoria: "Tecnologia",
    origem: "NODE-A",
  },
];

const nodeBBooks = [
  {
    id: "LIT-TEST",
    titulo: "Livro do nó B",
    autor: "Autor B",
    categoria: "Literatura",
    origem: "NODE-B",
  },
];

let appServer;
let nodeAServer;
let nodeBServer;
let baseUrl;

function startJsonServer(body) {
  return new Promise((resolve) => {
    const server = createServer((request, response) => {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(body));
    });

    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function serverUrl(server) {
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

before(async () => {
  nodeAServer = await startJsonServer(nodeABooks);
  nodeBServer = await startJsonServer(nodeBBooks);

  process.env.NODE_ID = "NODE-A";
  process.env.AGGREGATOR_ENABLED = "true";
  process.env.LOCAL_NODE_URL = serverUrl(nodeAServer);
  process.env.OTHER_NODE_URL = serverUrl(nodeBServer);
  process.env.REQUEST_TIMEOUT_MS = "1000";

  const { createApp } = await import("../src/app.js");

  appServer = await new Promise((resolve) => {
    const server = createApp().listen(0, "127.0.0.1", () => resolve(server));
  });
  baseUrl = serverUrl(appServer);
});

after(async () => {
  await Promise.all([
    closeServer(appServer),
    closeServer(nodeAServer),
    closeServer(nodeBServer),
  ]);
});

test("GET /health identifica a instância", async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { status: "ok", servidor: "NODE-A" });
});

test("GET /livros devolve somente o acervo local configurado", async () => {
  const response = await fetch(`${baseUrl}/livros`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.length, 4);
  assert.ok(body.every((book) => book.origem === "NODE-A"));
});

test("GET /agregador/todos combina os dois arrays", async () => {
  const response = await fetch(`${baseUrl}/agregador/todos`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.total, 2);
  assert.deepEqual(body.livros, [...nodeABooks, ...nodeBBooks]);
  assert.deepEqual(body.fontes, [
    { servidor: "NODE-A", quantidade: 1 },
    { servidor: "NODE-B", quantidade: 1 },
  ]);
});

test("uma rota inexistente responde 404", async () => {
  const response = await fetch(`${baseUrl}/nao-existe`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.status, "erro");
});

