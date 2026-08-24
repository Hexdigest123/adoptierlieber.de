import type { BondedPartner } from "./bond";
import { bondLabel } from "./bond";
import type { Animal, ApplicationField, Shelter, ShelterChecklist } from "../types";

export type StaffAnimal = {
  id: string;
  shelter_id: string;
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
  found_home_note: string | null;
  created_at: string;
  updated_at: string;
  unread_threads: number;
  thread_count: number;
};

export type StaffShelter = {
  id: string;
  org_name: string;
  street: string;
  zip: string;
  city: string;
  website: string | null;
  registration_number: string | null;
  description: string | null;
  verification_status: Shelter["verificationStatus"];
  verification_reason: string | null;
  notify_email: string | null;
  notify_last_error: string | null;
  has_logo: boolean;
  lat: number | null;
  lng: number | null;
  geocoded_at: string | null;
  application_form: ApplicationField[];
  checklist: ShelterChecklist;
  created_at: string;
};

export function toStaffAnimal(
  animal: Animal,
  extras?: { unread_threads?: number; thread_count?: number; bonded_partners?: BondedPartner[] },
): StaffAnimal {
  const bonded_partners = extras?.bonded_partners ?? [];
  return {
    id: animal.id,
    shelter_id: animal.shelterId,
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
    photos: animal.photos ?? [],
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
    found_home_note: animal.foundHomeNote,
    created_at: animal.createdAt.toISOString(),
    updated_at: animal.updatedAt.toISOString(),
    unread_threads: extras?.unread_threads ?? 0,
    thread_count: extras?.thread_count ?? 0,
  };
}

export function toStaffShelter(shelter: Shelter): StaffShelter {
  const form = Array.isArray(shelter.applicationForm)
    ? (shelter.applicationForm as ApplicationField[])
    : [];
  const checklist =
    shelter.checklist && typeof shelter.checklist === "object"
      ? (shelter.checklist as ShelterChecklist)
      : {};
  return {
    id: shelter.id,
    org_name: shelter.orgName,
    street: shelter.street,
    zip: shelter.zip,
    city: shelter.city,
    website: shelter.website,
    registration_number: shelter.registrationNumber,
    description: shelter.description,
    verification_status: shelter.verificationStatus,
    verification_reason: shelter.verificationReason,
    notify_email: shelter.notifyEmail,
    notify_last_error: shelter.notifyLastError,
    has_logo: Boolean(shelter.logoKey),
    lat: shelter.lat,
    lng: shelter.lng,
    geocoded_at: shelter.geocodedAt ? shelter.geocodedAt.toISOString() : null,
    application_form: form,
    checklist,
    created_at: shelter.createdAt.toISOString(),
  };
}

export function publishMissing(animal: Animal): string[] {
  const missing: string[] = [];
  if (!animal.name.trim()) missing.push("name");
  if (!animal.species) missing.push("species");
  if (!(animal.photos ?? []).length) missing.push("photos");
  if (!animal.ageUnknown && animal.ageMonths == null) missing.push("age");
  if (!animal.sex) missing.push("sex");
  if (!animal.tagline?.trim()) missing.push("tagline");
  if (!animal.description?.trim()) missing.push("description");
  if (!animal.vaccinated) missing.push("vaccinated");
  if (!animal.neutered) missing.push("neutered");
  if (!animal.chipped) missing.push("chipped");
  if (!animal.houseTrained) missing.push("house_trained");
  return missing;
}
