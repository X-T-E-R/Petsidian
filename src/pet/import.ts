import { resolveRuntimeRequire } from "../electron-runtime";
import type { ImportedPetRecord } from "./catalog";

type LocalPetManifest = {
  id?: string | null;
  displayName?: string | null;
  description?: string | null;
  spritesheetPath?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
};

type ResolvedRemotePet = {
  id: string;
  displayName: string;
  description: string;
  spritesheetUrl: string;
  sourceName: string;
  sourceUrl: string;
};

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_SPRITESHEET_BYTES = 10 * 1024 * 1024;
const WEBP_DATA_URL_PREFIX = "data:image/webp;base64,";

type FsPromisesModule = {
  readFile: (path: string) => Promise<Uint8Array>;
  stat: (path: string) => Promise<{ isDirectory: () => boolean; isFile: () => boolean; size: number }>;
  realpath: (path: string) => Promise<string>;
};

type PathModule = {
  dirname: (path: string) => string;
  basename: (path: string, suffix?: string) => string;
  extname: (path: string) => string;
  isAbsolute: (path: string) => boolean;
  join: (...paths: string[]) => string;
  resolve: (...paths: string[]) => string;
  relative: (from: string, to: string) => string;
  sep: string;
};

type NetModule = {
  isIP: (input: string) => number;
};

type IncomingMessageLike = {
  statusCode?: number;
  headers: Record<string, string | string[] | undefined>;
  on: (event: "data" | "end" | "error", callback: (...args: unknown[]) => void) => void;
  resume: () => void;
};

type ClientRequestLike = {
  on: (event: "error" | "timeout", callback: (...args: unknown[]) => void) => void;
  setTimeout: (timeoutMs: number, callback: () => void) => void;
  destroy: (error?: Error) => void;
  end: () => void;
};

type HttpsModule = {
  request: (
    url: string,
    options: {
      method: "GET";
      headers: Record<string, string>;
    },
    callback: (response: IncomingMessageLike) => void
  ) => ClientRequestLike;
};

type BufferModule = {
  Buffer: {
    from: (value: Uint8Array) => {
      toString: (encoding: string) => string;
    };
    concat: (chunks: Uint8Array[]) => Uint8Array;
  };
};

function getFsPromises(): FsPromisesModule {
  return resolveRuntimeRequire()("node:fs/promises") as FsPromisesModule;
}

function getPathModule(): PathModule {
  return resolveRuntimeRequire()("node:path") as PathModule;
}

function getNetModule(): NetModule {
  return resolveRuntimeRequire()("node:net") as NetModule;
}

function getHttpsModule(): HttpsModule {
  return resolveRuntimeRequire()("node:https") as HttpsModule;
}

function getBufferModule(): BufferModule {
  return resolveRuntimeRequire()("node:buffer") as BufferModule;
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function truncateChars(value: string, maxChars: number): string {
  return value.trim().slice(0, maxChars);
}

function sanitizePetId(rawValue: string): string {
  let output = "";
  const lower = rawValue.trim().toLowerCase();
  for (const character of lower) {
    if ((character >= "a" && character <= "z") || (character >= "0" && character <= "9")) {
      output += character;
      continue;
    }
    if ((character === "-" || character === "_" || character === " " || character === ".") && !output.endsWith("-")) {
      output += "-";
    }
  }
  const trimmed = output.replace(/^-+|-+$/g, "");
  return trimmed.length >= 2 ? trimmed : "imported-pet";
}

function isBlockedPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map((value) => Number(value));
  if (parts.length !== 4 || parts.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b !== undefined && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isBlockedPrivateIpv6(host: string): boolean {
  const normalized = host.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

function isBlockedHost(host: string): boolean {
  const net = getNetModule();
  const normalized = host.trim().replace(/^\[|\]$/g, "").toLowerCase();
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;
  const ipVersion = net.isIP(normalized);
  if (ipVersion === 4) return isBlockedPrivateIpv4(normalized);
  if (ipVersion === 6) return isBlockedPrivateIpv6(normalized);
  return false;
}

function parseSafeImportUrl(rawUrl: string): URL {
  const trimmed = rawUrl.trim();
  if (trimmed.length === 0) {
    throw new Error("Enter a pet page URL first.");
  }
  const url = new URL(trimmed);
  if (url.protocol !== "https:") {
    throw new Error("Only HTTPS pet pages are supported for website import.");
  }
  if (!url.hostname) {
    throw new Error("URL must include a host.");
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error("Local, private, and special network hosts are not allowed.");
  }
  return url;
}

function firstHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function fetchBytes(url: URL, maxBytes: number, redirectCount = 0): Promise<Uint8Array> {
  const safeUrl = parseSafeImportUrl(url.toString());
  const https = getHttpsModule();

  return new Promise((resolvePromise, rejectPromise) => {
    const request = https.request(
      safeUrl.toString(),
      {
        method: "GET",
        headers: {
          "User-Agent": "Petsidian/0.1 website-import",
          Accept: "*/*"
        }
      },
      (response) => {
        const statusCode = response.statusCode ?? 0;
        if (statusCode >= 300 && statusCode < 400) {
          const location = firstHeaderValue(response.headers.location);
          response.resume();
          if (!location) {
            rejectPromise(new Error(`Remote URL redirected without a Location header: ${safeUrl}`));
            return;
          }
          if (redirectCount >= 5) {
            rejectPromise(new Error("Remote URL redirected too many times."));
            return;
          }
          const nextUrl = parseSafeImportUrl(new URL(location, safeUrl).toString());
          void fetchBytes(nextUrl, maxBytes, redirectCount + 1)
            .then(resolvePromise)
            .catch(rejectPromise);
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          rejectPromise(new Error(`Failed to fetch ${safeUrl}: HTTP ${statusCode}`));
          return;
        }

        const contentLength = firstHeaderValue(response.headers["content-length"]);
        if (contentLength !== null && Number(contentLength) > maxBytes) {
          response.resume();
          rejectPromise(
            new Error(`Remote file is larger than ${Math.floor(maxBytes / 1024 / 1024)} MB.`)
          );
          return;
        }

        const chunks: Uint8Array[] = [];
        let receivedBytes = 0;
        response.on("data", (chunk) => {
          if (!(chunk instanceof Uint8Array)) return;
          receivedBytes += chunk.byteLength;
          if (receivedBytes > maxBytes) {
            request.destroy(
              new Error(`Remote file is larger than ${Math.floor(maxBytes / 1024 / 1024)} MB.`)
            );
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          resolvePromise(getBufferModule().Buffer.concat(chunks));
        });
        response.on("error", (error) => {
          rejectPromise(error instanceof Error ? error : new Error(String(error)));
        });
      }
    );

    request.setTimeout(25000, () => {
      request.destroy(new Error(`Timed out fetching ${safeUrl}.`));
    });
    request.on("error", (error) => {
      rejectPromise(error instanceof Error ? error : new Error(String(error)));
    });
    request.end();
  });
}

async function fetchText(url: URL, maxBytes: number): Promise<string> {
  const bytes = await fetchBytes(url, maxBytes);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

async function fetchJson<T>(url: URL, maxBytes: number): Promise<T> {
  const text = await fetchText(url, maxBytes);
  return JSON.parse(text) as T;
}

function validateWebp(bytes: Uint8Array): void {
  if (bytes.byteLength < 16) {
    throw new Error("Spritesheet is too small to be a valid WebP file.");
  }
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff !== "RIFF" || webp !== "WEBP") {
    throw new Error("Spritesheet must be a WebP image.");
  }
}

function bufferToWebpDataUrl(bytes: Uint8Array): string {
  validateWebp(bytes);
  return `${WEBP_DATA_URL_PREFIX}${getBufferModule().Buffer.from(bytes).toString("base64")}`;
}

function isSafeRelativePath(baseDir: string, targetPath: string): boolean {
  const path = getPathModule();
  const relative = path.relative(baseDir, targetPath);
  return relative.length > 0 && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

async function resolveLocalImportSource(sourceInput: string): Promise<ImportedPetRecord> {
  const fs = getFsPromises();
  const path = getPathModule();
  const source = sourceInput.trim();
  if (source.length === 0) {
    throw new Error("Source path is required.");
  }

  const canonicalSource = await fs.realpath(source);
  const sourceStat = await fs.stat(canonicalSource);
  let manifest: LocalPetManifest | null = null;
  let packageDir: string | null = null;
  let spritesheetPath: string | null = null;

  if (sourceStat.isDirectory()) {
    packageDir = canonicalSource;
    const manifestPath = path.join(packageDir, "pet.json");
    const parsedManifest = JSON.parse(await fetchLocalText(manifestPath)) as LocalPetManifest;
    manifest = parsedManifest;
    const manifestSpritesheetPath = toTrimmedString(parsedManifest.spritesheetPath) ?? "spritesheet.webp";
    const candidate = await fs.realpath(path.join(packageDir, manifestSpritesheetPath));
    if (!isSafeRelativePath(packageDir, candidate) && candidate !== path.join(packageDir, manifestSpritesheetPath)) {
      throw new Error("spritesheetPath must stay inside the package directory.");
    }
    spritesheetPath = candidate;
  } else if (sourceStat.isFile() && path.basename(canonicalSource).toLowerCase() === "pet.json") {
    packageDir = path.dirname(canonicalSource);
    const parsedManifest = JSON.parse(await fetchLocalText(canonicalSource)) as LocalPetManifest;
    manifest = parsedManifest;
    const manifestSpritesheetPath = toTrimmedString(parsedManifest.spritesheetPath) ?? "spritesheet.webp";
    const candidate = await fs.realpath(path.join(packageDir, manifestSpritesheetPath));
    if (!isSafeRelativePath(packageDir, candidate) && candidate !== path.join(packageDir, manifestSpritesheetPath)) {
      throw new Error("spritesheetPath must stay inside the package directory.");
    }
    spritesheetPath = candidate;
  } else if (sourceStat.isFile()) {
    spritesheetPath = canonicalSource;
  } else {
    throw new Error("Source path must be a package directory, pet.json, or spritesheet.webp.");
  }

  if (spritesheetPath === null || path.extname(spritesheetPath).toLowerCase() !== ".webp") {
    throw new Error("Current Petsidian imports require a .webp spritesheet.");
  }

  const spritesheetBytes = await readLocalWebp(spritesheetPath);
  const idHint =
    toTrimmedString(manifest?.id) ??
    (packageDir ? path.basename(packageDir) : null) ??
    path.basename(spritesheetPath, ".webp");
  const displayName =
    toTrimmedString(manifest?.displayName) ??
    humanizePetLabel(idHint);
  const description =
    toTrimmedString(manifest?.description) ??
    "Imported local pet.";

  return {
    id: sanitizePetId(idHint),
    displayName: truncateChars(displayName, 96),
    description: truncateChars(description, 280),
    spritesheetDataUrl: bufferToWebpDataUrl(spritesheetBytes),
    sourceName: toTrimmedString(manifest?.sourceName) ?? "Local",
    sourceUrl: toTrimmedString(manifest?.sourceUrl)
  };
}

async function fetchLocalText(pathValue: string): Promise<string> {
  const fs = getFsPromises();
  const bytes = await fs.readFile(pathValue);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

async function readLocalWebp(pathValue: string): Promise<Uint8Array> {
  const fs = getFsPromises();
  const stats = await fs.stat(pathValue);
  if (stats.size > MAX_SPRITESHEET_BYTES) {
    throw new Error(`Spritesheet is larger than ${Math.floor(MAX_SPRITESHEET_BYTES / 1024 / 1024)} MB.`);
  }
  const bytes = await fs.readFile(pathValue);
  validateWebp(bytes);
  return bytes;
}

function extractMetaContent(html: string, nameOrProperty: string): string | null {
  const escaped = nameOrProperty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, "i")
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return null;
}

function extractTitle(html: string): string | null {
  const match = /<title>([^<]+)<\/title>/i.exec(html);
  return match?.[1] ? decodeHtml(match[1]) : null;
}

function extractJsonLdValues(html: string): unknown[] {
  const matches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const values: unknown[] = [];
  for (const match of matches) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      values.push(JSON.parse(raw));
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }
  return values;
}

function findJsonString(value: unknown, key: string): string | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = findJsonString(entry, key);
      if (nested) return nested;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record[key] === "string") return record[key] as string;
    for (const nestedValue of Object.values(record)) {
      const nested = findJsonString(nestedValue, key);
      if (nested) return nested;
    }
  }
  return null;
}

function findJsonWebp(value: unknown): string | null {
  if (typeof value === "string") {
    return value.toLowerCase().includes(".webp") ? value : null;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = findJsonWebp(entry);
      if (nested) return nested;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      const nested = findJsonWebp(nestedValue);
      if (nested) return nested;
    }
  }
  return null;
}

function isLikelySpritesheet(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    lower.includes(".webp") &&
    !lower.includes("preview") &&
    !lower.includes("share") &&
    !lower.includes("social") &&
    !lower.includes("icon") &&
    !lower.includes("logo") &&
    !lower.includes("screenshot")
  );
}

function extractWebpUrl(html: string, baseUrl: URL): URL | null {
  const candidates = html
    .split(/[\s"'()<>;,]+/u)
    .filter((part) => part.toLowerCase().includes(".webp"))
    .filter(isLikelySpritesheet)
    .map((part) => {
      try {
        return new URL(part.trim(), baseUrl);
      } catch {
        return null;
      }
    })
    .filter((value): value is URL => value !== null)
    .sort((left, right) => scoreSpritesheetUrl(left.toString()) - scoreSpritesheetUrl(right.toString()));
  return candidates[0] ?? null;
}

function scoreSpritesheetUrl(value: string): number {
  const lower = value.toLowerCase();
  if (lower.includes("spritesheet.webp")) return 0;
  if (lower.includes("/sprites/")) return 1;
  return 2;
}

function extractPageDisplayName(html: string): string | null {
  const jsonLdValues = extractJsonLdValues(html);
  for (const value of jsonLdValues) {
    const name = findJsonString(value, "name");
    if (name) return cleanTitle(name);
  }
  return extractMetaContent(html, "og:title") ?? extractTitle(html);
}

function extractPageDescription(html: string): string | null {
  const jsonLdValues = extractJsonLdValues(html);
  for (const value of jsonLdValues) {
    const description = findJsonString(value, "description");
    if (description) return description;
  }
  return extractMetaContent(html, "description");
}

function extractPageSpritesheetUrl(html: string, baseUrl: URL): URL | null {
  const jsonLdValues = extractJsonLdValues(html);
  for (const value of jsonLdValues) {
    const candidate = findJsonWebp(value);
    if (candidate && isLikelySpritesheet(candidate)) {
      try {
        return new URL(candidate, baseUrl);
      } catch {
        // Ignore invalid candidate and continue.
      }
    }
  }
  return extractWebpUrl(html, baseUrl);
}

function cleanTitle(value: string): string {
  return value.split(" - ")[0]?.split(" | ")[0]?.trim() ?? value.trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function humanizePetLabel(id: string): string {
  return id
    .replace(/[-_.]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
}

type PetdexManifestEntry = {
  slug: string;
  displayName: string;
  spritesheetUrl: string;
  description?: string | null;
  pageUrl?: string | null;
};

type PetdexManifest = {
  pets: PetdexManifestEntry[];
};

async function resolvePetdexSource(sourceUrl: URL): Promise<ResolvedRemotePet> {
  const slug = sourceUrl.pathname.split("/").filter(Boolean);
  const petIndex = slug.findIndex((value) => value === "pets");
  const petSlug = petIndex >= 0 ? slug[petIndex + 1] : null;
  if (!petSlug) {
    throw new Error("Open a Petdex pet detail page, for example /pets/boba.");
  }
  const manifest = await fetchJson<PetdexManifest>(
    new URL("https://petdex.crafter.run/api/manifest"),
    MAX_JSON_BYTES
  );
  const pet = manifest.pets.find((entry) => entry.slug === petSlug);
  if (!pet) {
    throw new Error(`Petdex pet '${petSlug}' was not found in the public manifest.`);
  }
  const description =
    toTrimmedString(pet.description) ??
    (await fetchPageDescription(sourceUrl)) ??
    "Imported from Petdex.";

  return {
    id: sanitizePetId(pet.slug),
    displayName: truncateChars(pet.displayName, 96),
    description: truncateChars(description, 280),
    spritesheetUrl: parseSafeImportUrl(pet.spritesheetUrl).toString(),
    sourceName: "Petdex",
    sourceUrl: toTrimmedString(pet.pageUrl) ?? sourceUrl.toString()
  };
}

type CodexPetsDetail = {
  pet: {
    id: string;
    displayName: string;
    description: string;
    spritesheetUrl: string;
  };
};

function extractCodexPetsId(sourceUrl: URL): string | null {
  const pathParts = sourceUrl.pathname.split("/").filter(Boolean);
  const shareIndex = pathParts.findIndex((value) => value === "share");
  if (shareIndex >= 0 && pathParts[shareIndex + 1]) {
    return pathParts[shareIndex + 1] ?? null;
  }
  const fragment = sourceUrl.hash.replace(/^#\/?/, "");
  if (!fragment.startsWith("pets/")) return null;
  return fragment.slice("pets/".length).split("?")[0] ?? null;
}

async function resolveCodexPetsSource(sourceUrl: URL): Promise<ResolvedRemotePet> {
  const id = extractCodexPetsId(sourceUrl);
  if (!id) {
    throw new Error("Open a Codex Pets share/detail URL, for example /share/<pet-id> or #/pets/<pet-id>.");
  }
  const detailUrl = new URL(
    `https://ihzwckyzfcuktrljwpha.supabase.co/functions/v1/petshare/api/pets/${encodeURIComponent(id)}`
  );
  const detail = await fetchJson<CodexPetsDetail>(detailUrl, MAX_JSON_BYTES);
  return {
    id: sanitizePetId(detail.pet.id),
    displayName: truncateChars(detail.pet.displayName, 96),
    description: truncateChars(detail.pet.description, 280),
    spritesheetUrl: parseSafeImportUrl(detail.pet.spritesheetUrl).toString(),
    sourceName: "Codex Pets",
    sourceUrl: `https://codex-pets.net/share/${detail.pet.id}`
  };
}

async function fetchPageDescription(sourceUrl: URL): Promise<string | null> {
  const html = await fetchText(sourceUrl, MAX_HTML_BYTES);
  return extractPageDescription(html);
}

async function resolveGenericPetPage(sourceUrl: URL): Promise<ResolvedRemotePet> {
  const html = await fetchText(sourceUrl, MAX_HTML_BYTES);
  const displayName = extractPageDisplayName(html) ?? "Imported Pet";
  const description = extractPageDescription(html) ?? "Imported Codex-compatible pet.";
  const spritesheetUrl = extractPageSpritesheetUrl(html, sourceUrl);
  if (spritesheetUrl === null) {
    throw new Error("Could not find a Codex-compatible spritesheet.webp on this page.");
  }
  const pathParts = sourceUrl.pathname.split("/").filter(Boolean);
  const idHint = pathParts[pathParts.length - 1] ?? displayName;
  return {
    id: sanitizePetId(idHint),
    displayName: truncateChars(displayName, 96),
    description: truncateChars(description, 280),
    spritesheetUrl: parseSafeImportUrl(spritesheetUrl.toString()).toString(),
    sourceName: sourceUrl.hostname.replace(/^www\./u, ""),
    sourceUrl: sourceUrl.toString()
  };
}

async function resolveWebsiteImportSource(rawUrl: string): Promise<ResolvedRemotePet> {
  const sourceUrl = parseSafeImportUrl(rawUrl);
  switch (sourceUrl.hostname.toLowerCase()) {
    case "petdex.crafter.run":
      return resolvePetdexSource(sourceUrl);
    case "codex-pets.net":
    case "www.codex-pets.net":
      return resolveCodexPetsSource(sourceUrl);
    default:
      return resolveGenericPetPage(sourceUrl);
  }
}

export async function importLocalPetFromSource(sourceInput: string): Promise<ImportedPetRecord> {
  return resolveLocalImportSource(sourceInput);
}

export async function importWebsitePetFromUrl(rawUrl: string): Promise<ImportedPetRecord> {
  const resolved = await resolveWebsiteImportSource(rawUrl);
  const spritesheetBytes = await fetchBytes(new URL(resolved.spritesheetUrl), MAX_SPRITESHEET_BYTES);
  validateWebp(spritesheetBytes);
  return {
    id: resolved.id,
    displayName: resolved.displayName,
    description: resolved.description,
    spritesheetDataUrl: bufferToWebpDataUrl(spritesheetBytes),
    sourceName: resolved.sourceName,
    sourceUrl: resolved.sourceUrl
  };
}
