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
const aggregatorEnabled =
  (process.env.AGGREGATOR_ENABLED ?? "false").toLowerCase() === "true";

if (!["NODE-A", "NODE-B"].includes(nodeId)) {
  throw new Error("NODE_ID deve ser NODE-A ou NODE-B.");
}

if (aggregatorEnabled && !process.env.OTHER_NODE_URL) {
  throw new Error("OTHER_NODE_URL é obrigatório quando o agregador está ativo.");
}

export const config = Object.freeze({
  nodeId,
  port: parsePositiveInteger(process.env.PORT, 3000, "PORT"),
  aggregatorEnabled,
  localNodeUrl: removeTrailingSlash(
    process.env.LOCAL_NODE_URL ?? "http://127.0.0.1:3000",
  ),
  otherNodeUrl: process.env.OTHER_NODE_URL
    ? removeTrailingSlash(process.env.OTHER_NODE_URL)
    : null,
  requestTimeoutMs: parsePositiveInteger(
    process.env.REQUEST_TIMEOUT_MS,
    3000,
    "REQUEST_TIMEOUT_MS",
  ),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
});

