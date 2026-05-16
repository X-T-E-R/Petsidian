export const NATIVE_OBSIDIAN_SIGNAL_KEYS = [
  "file-open",
  "vault-create",
  "vault-modify",
  "vault-rename",
  "vault-delete",
  "metadata-changed",
  "metadata-resolved",
  "editor-activity"
] as const;

export type NativeObsidianSignalKey = (typeof NATIVE_OBSIDIAN_SIGNAL_KEYS)[number];

export type NativeObsidianSignalSettings = Record<NativeObsidianSignalKey, boolean>;

export type NativeObsidianSignalDefinition = {
  label: string;
  description: string;
  debounceMs: number;
};

export const DEFAULT_NATIVE_EVENT_COOLDOWN_MS = 20000;

export const DEFAULT_NATIVE_OBSIDIAN_SIGNAL_SETTINGS: NativeObsidianSignalSettings = {
  "file-open": true,
  "vault-create": true,
  "vault-modify": false,
  "vault-rename": true,
  "vault-delete": true,
  "metadata-changed": false,
  "metadata-resolved": false,
  "editor-activity": false
};

export const NATIVE_OBSIDIAN_SIGNAL_DEFINITIONS: Record<
  NativeObsidianSignalKey,
  NativeObsidianSignalDefinition
> = {
  "file-open": {
    label: "File open",
    description: "React when the active note or canvas file changes.",
    debounceMs: 250
  },
  "vault-create": {
    label: "Vault create",
    description: "React when a new file appears after the vault layout is ready.",
    debounceMs: 500
  },
  "vault-modify": {
    label: "Vault modify",
    description: "React to saved file changes. This is noisier than file-open or create.",
    debounceMs: 2000
  },
  "vault-rename": {
    label: "Vault rename",
    description: "React when a file is renamed or moved.",
    debounceMs: 500
  },
  "vault-delete": {
    label: "Vault delete",
    description: "React when a file is removed from the vault.",
    debounceMs: 500
  },
  "metadata-changed": {
    label: "Metadata changed",
    description: "React when Obsidian finishes indexing a file's metadata cache.",
    debounceMs: 1500
  },
  "metadata-resolved": {
    label: "Metadata resolved",
    description: "React when link resolution finishes after metadata updates.",
    debounceMs: 2000
  },
  "editor-activity": {
    label: "Editor activity",
    description: "React to typing/editing in the active Markdown editor.",
    debounceMs: 1800
  }
};

export function isNativeObsidianSignalKey(
  value: string | null | undefined
): value is NativeObsidianSignalKey {
  return (
    typeof value === "string" &&
    NATIVE_OBSIDIAN_SIGNAL_KEYS.includes(value as NativeObsidianSignalKey)
  );
}
