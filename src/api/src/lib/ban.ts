import { hashToken } from "./hashing";

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
