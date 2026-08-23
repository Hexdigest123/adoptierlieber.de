import type { Animal } from "../types";

export const BOND_GROUP_MAX = 100;

export type BondedPartner = {
  id: string;
  name: string;
};

export function bondLabel(others: { name: string }[]): string | null {
  const names = others.map((row) => row.name.trim()).filter(Boolean);
  if (!names.length) return null;
  const joined = names.join(", ");
  return joined.length <= 80 ? joined : `${joined.slice(0, 79)}…`;
}

export function partnersOf(
  animal: Animal,
  grouped: Animal[],
  byId: Map<string, Animal>,
  listedOnly = false,
): BondedPartner[] {
  const rows = animal.bondGroupId
    ? grouped.filter((row) => row.bondGroupId === animal.bondGroupId && row.id !== animal.id)
    : animal.bondedAnimalId
      ? [byId.get(animal.bondedAnimalId)].filter((row): row is Animal => Boolean(row))
      : [];
  return rows
    .filter((row) => !listedOnly || row.status !== "draft")
    .map((row) => ({ id: row.id, name: row.name }));
}

export function partnerMap(
  animals: Animal[],
  grouped: Animal[],
  extras: Animal[],
  listedOnly = false,
): Map<string, BondedPartner[]> {
  const byId = new Map([...grouped, ...extras].map((row) => [row.id, row]));
  return new Map(
    animals.map((animal) => [animal.id, partnersOf(animal, grouped, byId, listedOnly)]),
  );
}
