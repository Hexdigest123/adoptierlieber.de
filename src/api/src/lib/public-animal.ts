import type { BondedPartner } from "./bond";
import { bondLabel } from "./bond";
import type { Animal, Shelter } from "../types";

export type PublicAnimal = {
  id: string;
  name: string;
  species: Animal["species"];
  breed: string | null;
  sex: Animal["sex"];
  age_months: number | null;
  age_unknown: boolean;
  size: Animal["size"];
  colors: string[];
  traits: string[];
  tagline: string | null;
  description: string | null;
  photos: string[];
  status: Animal["status"];
  vaccinated: Animal["vaccinated"];
  neutered: Animal["neutered"];
  chipped: Animal["chipped"];
  house_trained: Animal["houseTrained"];
  bonded_partner: string | null;
  bonded_animal_id: string | null;
  bond_group_id: string | null;
  bonded_partners: BondedPartner[];
  like_count: number;
  impression_count: number;
  published_at: string | null;
  found_home_at: string | null;
  shelter: {
    id: string;
    org_name: string;
    city: string;
    zip: string;
    lat: number | null;
    lng: number | null;
  };
  lat: number | null;
  lng: number | null;
  distance_km: number | null;
  liked: boolean;
};

export type PublicExcerpt = {
  id: string;
  name: string;
  species: Animal["species"];
  age_months: number | null;
  age_unknown: boolean;
  tagline: string | null;
  photos: string[];
  shelter: {
    id: string;
    org_name: string;
    city: string;
  };
  lat: number | null;
  lng: number | null;
};

export function photoUrl(animalId: string, index: number): string {
  return `/api/animals/${animalId}/photos/${index}`;
}

function photoUrls(animalId: string, photos: string[] | null): string[] {
  const count = photos?.length ?? 0;
  return Array.from({ length: count }, (_, i) => photoUrl(animalId, i));
}

export function toPublicAnimal(
  animal: Animal,
  shelter: Shelter,
  extra: {
    distance_km?: number | null;
    liked?: boolean;
    bonded_partners?: BondedPartner[];
  } = {},
): PublicAnimal {
  const bonded_partners = extra.bonded_partners ?? [];
  return {
    id: animal.id,
    name: animal.name,
    species: animal.species,
    breed: animal.breed,
    sex: animal.sex,
    age_months: animal.ageMonths,
    age_unknown: animal.ageUnknown,
    size: animal.size,
    colors: animal.colors ?? [],
    traits: animal.traits ?? [],
    tagline: animal.tagline,
    description: animal.description,
    photos: photoUrls(animal.id, animal.photos),
    status: animal.status,
    vaccinated: animal.vaccinated,
    neutered: animal.neutered,
    chipped: animal.chipped,
    house_trained: animal.houseTrained,
    bonded_partner: bondLabel(bonded_partners) ?? animal.bondedPartner,
    bonded_animal_id: bonded_partners[0]?.id ?? animal.bondedAnimalId,
    bond_group_id: animal.bondGroupId,
    bonded_partners,
    like_count: animal.likeCount,
    impression_count: animal.impressionCount,
    published_at: animal.publishedAt ? animal.publishedAt.toISOString() : null,
    found_home_at: animal.foundHomeAt ? animal.foundHomeAt.toISOString() : null,
    shelter: {
      id: shelter.id,
      org_name: shelter.orgName,
      city: shelter.city,
      zip: shelter.zip,
      lat: shelter.lat,
      lng: shelter.lng,
    },
    lat: shelter.lat,
    lng: shelter.lng,
    distance_km: extra.distance_km ?? null,
    liked: extra.liked ?? false,
  };
}

export function toPublicExcerpt(animal: Animal, shelter: Shelter): PublicExcerpt {
  return {
    id: animal.id,
    name: animal.name,
    species: animal.species,
    age_months: animal.ageMonths,
    age_unknown: animal.ageUnknown,
    tagline: animal.tagline,
    photos: photoUrls(animal.id, animal.photos),
    shelter: {
      id: shelter.id,
      org_name: shelter.orgName,
      city: shelter.city,
    },
    lat: shelter.lat,
    lng: shelter.lng,
  };
}
