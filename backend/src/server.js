import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();

app.listen(config.port, "0.0.0.0", () => {
  console.log(
    `${config.nodeId} disponível em http://0.0.0.0:${config.port} ` +
      `(agregador: ${config.aggregatorEnabled ? "ativo" : "inativo"})`,
  );
});

