async function getJson(baseUrl, path) {
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  } catch {
    throw new Error(
      `Não foi possível acessar ${baseUrl}. Confira o IP da VM 1, o Nginx e a rede.`,
    );
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      body?.mensagem ?? body?.erro ?? `A requisição falhou com HTTP ${response.status}.`,
    );
  }

  return body;
}

export function fetchAllBooks(baseUrl) {
  return getJson(baseUrl, "/biblioteca/todos");
}

export function fetchBalancedInstance(baseUrl) {
  return getJson(baseUrl, "/balanceamento/");
}
