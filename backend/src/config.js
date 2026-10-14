import "dotenv/config";

function removeTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function parsePositiveInteger(value, fallback, variableName) {
  const parsedValue = Number(value ?? fallback);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${variableName} deve ser um número inteiro positivo.`);
  }

  return parsedValue;
}

const nodeId = (process.env.NODE_ID ?? "NODE-A").toUpperCase();

if (!["NODE-A", "NODE-B"].includes(nodeId)) {
  throw new Error("NODE_ID deve ser NODE-A ou NODE-B.");
}

export const config = Object.freeze({
  nodeId,
  port: parsePositiveInteger(process.env.PORT, 3000, "PORT"),
  aggregatorEnabled:
    (process.env.AGGREGATOR_ENABLED ?? "false").toLowerCase() === "true",
  localNodeUrl: removeTrailingSlash(
    process.env.LOCAL_NODE_URL ?? "http://127.0.0.1:3000",
  ),
  otherNodeUrl: removeTrailingSlash(
    process.env.OTHER_NODE_URL ?? "http://192.168.56.103:3000",
  ),
  requestTimeoutMs: parsePositiveInteger(
    process.env.REQUEST_TIMEOUT_MS,
    3000,
    "REQUEST_TIMEOUT_MS",
  ),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
});

