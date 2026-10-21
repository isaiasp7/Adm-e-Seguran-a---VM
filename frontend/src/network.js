const SESSION_KEY = "biblioteca.vm1.session";
const LAST_IP_KEY = "biblioteca.vm1.lastIp";

export function parseVm1Ip(value) {
  const trimmed = value.trim();
  const ip = trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const octets = ip.split(".");

  if (
    octets.length !== 4 ||
    !octets.every((octet) => /^(0|[1-9]\d{0,2})$/.test(octet) && Number(octet) <= 255)
  ) {
    throw new Error("Digite apenas o IPv4 da VM 1, por exemplo: 192.168.56.107.");
  }

  return ip;
}

export function getSessionIp() {
  try {
    return parseVm1Ip(sessionStorage.getItem(SESSION_KEY) ?? "");
  } catch {
    return null;
  }
}

export function getLastIp() {
  try {
    return localStorage.getItem(LAST_IP_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberIp(ip) {
  try {
    sessionStorage.setItem(SESSION_KEY, ip);
    localStorage.setItem(LAST_IP_KEY, ip);
  } catch {
    // O endereço continua válido nesta página mesmo se o navegador bloquear storage.
  }
}
