import express from "express";

import { config } from "./config.js";
import { getLocalBooks } from "./data/books.js";

async function fetchJson(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`${url} respondeu com HTTP ${response.status}.`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function assertBookArray(value, nodeName) {
  if (!Array.isArray(value)) {
    throw new Error(`${nodeName} não devolveu um array de livros.`);
  }
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.use((request, response, next) => {
    response.setHeader("Access-Control-Allow-Origin", config.corsOrigin);
    response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (request.method === "OPTIONS") {
      return response.sendStatus(204);
    }

    return next();
  });

  app.get("/health", (request, response) => {
    response.json({ status: "ok", servidor: config.nodeId });
  });

  app.get("/instance", (request, response) => {
    response.json({
      servidor: config.nodeId,
      agregador: config.aggregatorEnabled,
    });
  });

  app.get("/livros", (request, response) => {
    response.json(getLocalBooks(config.nodeId));
  });

  if (config.aggregatorEnabled) {
    app.get("/agregador/todos", async (request, response) => {
      try {
        const [localBooks, remoteBooks] = await Promise.all([
          fetchJson(`${config.localNodeUrl}/livros`),
          fetchJson(`${config.otherNodeUrl}/livros`),
        ]);

        assertBookArray(localBooks, "NODE-A");
        assertBookArray(remoteBooks, "NODE-B");

        const books = [...localBooks, ...remoteBooks];

        response.json({
          status: "ok",
          total: books.length,
          fontes: [
            { servidor: "NODE-A", quantidade: localBooks.length },
            { servidor: "NODE-B", quantidade: remoteBooks.length },
          ],
          livros: books,
        });
      } catch (error) {
        const timedOut = error.name === "AbortError";

        response.status(502).json({
          status: "erro",
          mensagem: "Não foi possível consultar todos os nós da biblioteca.",
          causa: timedOut
            ? "Um dos nós excedeu o tempo limite."
            : error.message,
        });
      }
    });
  }

  app.use((request, response) => {
    response.status(404).json({
      status: "erro",
      mensagem: "Rota não encontrada.",
      servidor: config.nodeId,
    });
  });

  return app;
}

