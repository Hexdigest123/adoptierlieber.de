export const VISIT_SECTIONS = ["landing", "app", "animal", "shelter", "auth", "other"] as const;

export type VisitSection = (typeof VISIT_SECTIONS)[number];
