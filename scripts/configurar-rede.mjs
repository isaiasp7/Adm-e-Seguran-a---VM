import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function ipv4(value) {
  if (typeof value !== "string") return false;
  const octets = value.split(".");
  return (
    octets.length === 4 &&
    octets.every((octet) =>
      /^(0|[1-9]\d{0,2})$/.test(octet) && Number(octet) <= 255,
    )
  );
}

function option(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Informe um diretório após ${name}.`);
  }
  return resolve(value);
}

async function save(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
  console.log(`Gerado: ${path}`);
}

const unknown = args.filter(
  (arg, index) =>
    !["--vm1-api-dir", "--nginx-conf-dir"].includes(arg) &&
    !["--vm1-api-dir", "--nginx-conf-dir"].includes(args[index - 1]),
);
if (unknown.length > 0) {
  throw new Error(`Argumento desconhecido: ${unknown[0]}`);
}

const vm1ApiDir = option("--vm1-api-dir");
const nginxConfDir = option("--nginx-conf-dir");
const network = JSON.parse(
  await readFile(join(projectRoot, "config", "rede.json"), "utf8"),
);

if (!ipv4(network.vm2)) {
  throw new Error("config/rede.json deve ter o IPv4 válido da VM 2.");
}

const vm1Network = `${JSON.stringify({ vm2: network.vm2 }, null, 2)}\n`;
const upstreamServers = `# Gerado por scripts/configurar-rede.mjs. Inclua dentro do upstream existente.\nserver 127.0.0.1:3000;\nserver ${network.vm2}:3000;\n`;

await save(
  join(projectRoot, "VMs", "V1", "biblioteca-api", "rede-gerada.json"),
  vm1Network,
);
await save(
  join(projectRoot, "nginx", "rede-upstream-servers.conf"),
  upstreamServers,
);

if (vm1ApiDir) {
  await save(join(vm1ApiDir, "rede-gerada.json"), vm1Network);
}
if (nginxConfDir) {
  await save(join(nginxConfDir, "rede-upstream-servers.conf"), upstreamServers);
}

console.log(
  `Arquivos da VM 1 preparados para NODE-B ${network.vm2}. Informe o IP da VM 1 na tela do React; valide e recarregue o Nginx na VM 1.`,
);
