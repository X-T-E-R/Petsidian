import { PET_ATLAS } from "./animation";

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

export type PetId = string;

function petFillForRow(row: number): string {
  const fills = [
    "#f8d98d",
    "#f5c46c",
    "#f2b85e",
    "#f7d480",
    "#ffce76",
    "#b9c2d1",
    "#c7d7ff",
    "#e6bd7d",
    "#bce8dc"
  ] as const;
  return fills[row] ?? "#f8d98d";
}

function buildNiaAtlasDataUrl(): string {
  const cells: string[] = [];

  for (let row = 0; row < PET_ATLAS.rows; row += 1) {
    for (let column = 0; column < PET_ATLAS.columns; column += 1) {
      const x = column * PET_ATLAS.cellWidth;
      const y = row * PET_ATLAS.cellHeight;
      const bob = row === 4 ? -Math.abs((column % 5) - 2) * 7 : Math.sin(column) * 4;
      const lean = row === 1 ? 7 : row === 2 ? -7 : 0;
      const armSwing = row === 3 ? (column % 2 === 0 ? -20 : 16) : row === 8 ? -8 : 0;
      const earColor = row === 5 ? "#b8b5c0" : "#f3cdb5";
      const bodyColor = petFillForRow(row);
      const eyeColor = row === 5 ? "#778399" : "#2ca6a4";
      const mouth = row === 5 ? "M84 112 Q96 104 108 112" : "M84 110 Q96 120 108 110";

      cells.push(`
        <g transform="translate(${x + lean} ${y + bob})">
          <rect x="${-lean}" y="${-bob}" width="${PET_ATLAS.cellWidth}" height="${PET_ATLAS.cellHeight}" fill="transparent"/>
          <ellipse cx="96" cy="150" rx="46" ry="38" fill="#ffffff" opacity="0.98"/>
          <path d="M65 126 Q96 92 127 126 L122 154 Q96 171 70 154 Z" fill="${bodyColor}"/>
          <path d="M55 95 L18 69 L48 118 Z" fill="${earColor}"/>
          <path d="M137 95 L174 69 L144 118 Z" fill="${earColor}"/>
          <path d="M53 91 Q96 28 139 91 Q125 74 96 76 Q67 74 53 91 Z" fill="#f9e29b"/>
          <circle cx="76" cy="100" r="8" fill="${eyeColor}"/>
          <circle cx="116" cy="100" r="8" fill="${eyeColor}"/>
          <circle cx="78" cy="97" r="2.5" fill="#ffffff"/>
          <circle cx="118" cy="97" r="2.5" fill="#ffffff"/>
          <path d="${mouth}" fill="none" stroke="#5f4b43" stroke-width="4" stroke-linecap="round"/>
          <path d="M63 147 q${-16 + armSwing} ${row === 6 ? 12 : -12} -22 28" fill="none" stroke="#f3cdb5" stroke-width="13" stroke-linecap="round"/>
          <path d="M129 147 q${16 - armSwing} ${row === 6 ? 12 : -12} 22 28" fill="none" stroke="#f3cdb5" stroke-width="13" stroke-linecap="round"/>
          <rect x="70" y="132" width="52" height="54" rx="18" fill="#f7fbff"/>
          <text x="96" y="188" text-anchor="middle" font-family="Verdana, sans-serif" font-size="16" fill="#5d6877">Nia</text>
        </g>
      `);
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PET_ATLAS.width}" height="${PET_ATLAS.height}" viewBox="0 0 ${PET_ATLAS.width} ${PET_ATLAS.height}">${cells.join("")}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const PET_CATALOG = [
  {
    id: "nia",
    displayName: "Nia",
    description:
      "Bundled fallback Nia pet using the OpenPet atlas layout and a generated SVG spritesheet.",
    spritesheetPath: "generated-nia-atlas.svg",
    spritesheetUrl: buildNiaAtlasDataUrl(),
    imported: false
  }
] as const satisfies readonly PetCatalogItem[];

export function getCatalogPet(
  id: PetId,
  catalog: readonly PetCatalogItem[] = PET_CATALOG
): PetCatalogItem {
  return catalog.find((pet) => pet.id === id) ?? catalog[0] ?? PET_CATALOG[0];
}

export function getPetSpritesheetUrl(pet: PetCatalogItem): string {
  return pet.spritesheetUrl;
}
