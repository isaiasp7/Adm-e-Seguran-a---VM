const configuredBaseUrl =
  import.meta.env.VITE_NGINX_BASE_URL ?? "http://192.168.56.101";

export const nginxBaseUrl = configuredBaseUrl.replace(/\/+$/, "");

async function getJson(path) {
  const response = await fetch(`${nginxBaseUrl}${path}`, {
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      body?.mensagem ?? `A requisição falhou com HTTP ${response.status}.`,
    );
  }

  return body;
}

export function fetchAllBooks() {
  return getJson("/biblioteca/todos");
}

export function fetchBalancedInstance() {
  return getJson("/balanceamento/");
}
