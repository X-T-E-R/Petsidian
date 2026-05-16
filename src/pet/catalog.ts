import niaSpritesheetUrl from "./assets/nia-spritesheet.webp";
import petsidianCubSpritesheetUrl from "./assets/petsidian-cub-spritesheet.webp";

export type PetCatalogItem = {
  id: string;
  displayName: string;
  description: string;
  spritesheetPath: string;
  spritesheetUrl: string;
  sourceName?: string | null;
  sourceUrl?: string | null;
  imported: boolean;
};

export type ImportedPetRecord = {
  id: string;
  displayName: string;
  description: string;
  spritesheetDataUrl?: string | null;
  spritesheetStoragePath?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
};

export type PetId = string;

export function isPetId(
  value: string,
  catalog: readonly PetCatalogItem[] = PET_CATALOG
): value is PetId {
  return catalog.some((pet) => pet.id === value);
}

export function getCombinedPetCatalog(
  importedPets: readonly ImportedPetRecord[]
): readonly PetCatalogItem[] {
  const hydratedImportedPets = importedPets.filter(hasImportedPetSpritesheetData);
  if (hydratedImportedPets.length === 0) return PET_CATALOG;
  const importedIds = new Set(hydratedImportedPets.map((pet) => pet.id));
  return [
    ...PET_CATALOG.filter((pet) => !importedIds.has(pet.id)),
    ...hydratedImportedPets.map(createImportedCatalogItem)
  ];
}

export const PET_CATALOG = [
  {
    id: "petsidian-cub",
    displayName: "Petsidian Cub",
    description:
      "A lively lavender kitten-fox cub mascot matched to the Petsidian logo, with a purple diamond forehead gem.",
    spritesheetPath: "petsidian-cub-spritesheet.webp",
    spritesheetUrl: petsidianCubSpritesheetUrl,
    imported: false
  },
  {
    id: "nia",
    displayName: "Nia",
    description:
      "A larger elf-eared blonde Nia pet with independently generated action animations.",
    spritesheetPath: "nia-spritesheet.webp",
    spritesheetUrl: niaSpritesheetUrl,
    imported: false
  }
] as const satisfies readonly PetCatalogItem[];

export function createImportedCatalogItem(pet: ImportedPetRecord): PetCatalogItem {
  return {
    id: pet.id,
    displayName: pet.displayName,
    description: pet.description,
    spritesheetPath: pet.spritesheetStoragePath ?? "imported-data-url.webp",
    spritesheetUrl: pet.spritesheetDataUrl ?? "",
    sourceName: pet.sourceName ?? null,
    sourceUrl: pet.sourceUrl ?? null,
    imported: true
  };
}

export function getCatalogPet(
  id: PetId,
  catalog: readonly PetCatalogItem[] = PET_CATALOG
): PetCatalogItem {
  return catalog.find((pet) => pet.id === id) ?? catalog[0] ?? PET_CATALOG[0];
}

export function getPetSpritesheetUrl(pet: PetCatalogItem): string {
  return pet.spritesheetUrl;
}

export function hasImportedPetSpritesheetData(pet: ImportedPetRecord): boolean {
  return typeof pet.spritesheetDataUrl === "string" && pet.spritesheetDataUrl.startsWith("data:image/webp;base64,");
}
