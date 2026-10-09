import { hashToken } from "./hashing";
import { normalizeEmail } from "./roles";

function collapseWs(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeBanParts(input: {
  name: string;
  street: string;
  zip: string;
  city: string;
}): { name: string; addr: string } {
  return {
    name: collapseWs(input.name),
    addr: collapseWs(`${input.street} ${input.zip} ${input.city}`),
  };
}

export async function banFingerprint(input: {
  name: string;
  street: string;
  zip: string;
  city: string;
}): Promise<string> {
  const parts = normalizeBanParts(input);
  return hashToken(`${parts.name}|${parts.addr}`);
}

export async function banEmailHash(email: string): Promise<string> {
  return hashToken(`email|${normalizeEmail(email)}`);
}

/**
 * Email bans share ban_fingerprints with the name/address rows. Their key is
 * `e:<email hash>:<fingerprint>` so they stay out of the admin list and are
 * dropped together with the fingerprint they were banned with.
 */
export function banEmailKey(emailHash: string, fingerprint: string): string {
  return `e:${emailHash}:${fingerprint}`;
}
