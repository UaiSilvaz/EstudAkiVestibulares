import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

export function isPrivateAddress(address: string) {
  const kind = isIP(address);
  if (kind === 4) return isPrivateIpv4(address);
  if (kind === 6) return isPrivateIpv6(address);
  return false;
}

export function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal")
  );
}

export async function assertPublicHttpsUrl(url: URL) {
  if (url.protocol !== "https:") {
    throw new Error("Apenas HTTPS publico e permitido.");
  }

  if (isBlockedHostname(url.hostname) || isPrivateAddress(url.hostname)) {
    throw new Error("Host privado recusado.");
  }

  const records = await lookup(url.hostname, { all: true, verbatim: false });
  if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error("Destino privado recusado.");
  }
}
