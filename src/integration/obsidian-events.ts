import { type App, type EventRef, MarkdownView, Notice, TAbstractFile, TFile } from "obsidian";
import { type PetsidianSettings } from "../pet/settings";
import { getLocalizedNativeEventBubble } from "../pet/ui-text";
import { NativeEventRouter } from "./event-router";

type NativeEventHost = {
  readonly app: App;
  readonly settings: PetsidianSettings;
  registerEvent(eventRef: EventRef): void;
  triggerCompanionEvent(
    eventType: string,
    options?: { bubbleText?: string | null }
  ): Promise<void>;
};

type ManagedEventRef = {
  emitter: {
    offref(ref: EventRef): void;
  };
  ref: EventRef;
};

function isMarkdownFile(file: TAbstractFile): file is TFile {
  return file instanceof TFile && file.extension === "md";
}

function isTFile(file: TAbstractFile): file is TFile {
  return file instanceof TFile;
}

function summarizeFile(file: TFile | null): string | null {
  if (file === null) {
    return null;
  }
  return trimForBubble(file.basename);
}

function trimForBubble(value: string, maxLength = 72): string {
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 1)}…`;
}

export class NativeObsidianEventController {
  private readonly router: NativeEventRouter;
  private readonly activeRefs: ManagedEventRef[] = [];
  private layoutReady = false;

  constructor(private readonly host: NativeEventHost) {
    this.router = new NativeEventRouter(host);
  }

  onLayoutReady(): void {
    this.layoutReady = true;
    this.refresh();
  }

  refresh(): void {
    if (!this.layoutReady || !this.host.settings.integrations.nativeEventReactionsEnabled) {
      this.unregisterAll();
      this.router.clear();
      return;
    }

    if (this.activeRefs.length > 0) {
      return;
    }

    this.register(
      this.host.app.workspace,
      this.host.app.workspace.on("file-open", (file) => {
        const label = summarizeFile(file);
        if (label === null) {
          return;
        }
        this.router.queue("file-open", {
          eventType: "attention",
          bubbleText: getLocalizedNativeEventBubble(this.host.settings.language, "file-open", label)
        });
      })
    );

    this.register(
      this.host.app.vault,
      this.host.app.vault.on("create", (file) => {
        if (!isMarkdownFile(file)) {
          return;
        }
        this.router.queue("vault-create", {
          eventType: "success",
          bubbleText: getLocalizedNativeEventBubble(
            this.host.settings.language,
            "vault-create",
            trimForBubble(file.basename)
          )
        });
      })
    );

    this.register(
      this.host.app.vault,
      this.host.app.vault.on("modify", (file) => {
        if (!isMarkdownFile(file)) {
          return;
        }
        this.router.queue("vault-modify", {
          eventType: "reviewing",
          bubbleText: getLocalizedNativeEventBubble(
            this.host.settings.language,
            "vault-modify",
            trimForBubble(file.basename)
          )
        });
      })
    );

    this.register(
      this.host.app.vault,
      this.host.app.vault.on("rename", (file) => {
        if (!isTFile(file)) {
          return;
        }
        this.router.queue("vault-rename", {
          eventType: "attention",
          bubbleText: getLocalizedNativeEventBubble(
            this.host.settings.language,
            "vault-rename",
            trimForBubble(file.basename)
          )
        });
      })
    );

    this.register(
      this.host.app.vault,
      this.host.app.vault.on("delete", (file) => {
        if (!isTFile(file)) {
          return;
        }
        this.router.queue("vault-delete", {
          eventType: "failure",
          bubbleText: getLocalizedNativeEventBubble(
            this.host.settings.language,
            "vault-delete",
            trimForBubble(file.basename)
          )
        });
      })
    );

    this.register(
      this.host.app.metadataCache,
      this.host.app.metadataCache.on("changed", (file) => {
        this.router.queue("metadata-changed", {
          eventType: "thinking",
          bubbleText: getLocalizedNativeEventBubble(
            this.host.settings.language,
            "metadata-changed",
            trimForBubble(file.basename)
          )
        });
      })
    );

    this.register(
      this.host.app.metadataCache,
      this.host.app.metadataCache.on("resolved", () => {
        this.router.queue("metadata-resolved", {
          eventType: "reviewing",
          bubbleText: getLocalizedNativeEventBubble(
            this.host.settings.language,
            "metadata-resolved"
          )
        });
      })
    );

    this.register(
      this.host.app.workspace,
      this.host.app.workspace.on("editor-change", (_editor, info) => {
        const currentFile = "file" in info ? info.file : this.host.app.workspace.getActiveFile();
        const label = summarizeFile(currentFile);
        if (label === null) {
          return;
        }
        this.router.queue("editor-activity", {
          eventType: "thinking",
          bubbleText: getLocalizedNativeEventBubble(
            this.host.settings.language,
            "editor-activity",
            label
          )
        });
      })
    );
  }

  destroy(): void {
    this.unregisterAll();
    this.router.clear();
  }

  getEditorActivityFallbackQuery(): string | null {
    const activeView = this.host.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView === null) {
      return null;
    }

    const selection = activeView.editor.getSelection().trim();
    if (selection.length > 0) {
      return trimForBubble(selection, 96);
    }

    return summarizeFile(activeView.file);
  }

  private register(
    emitter: {
      offref(ref: EventRef): void;
    },
    ref: EventRef
  ): void {
    this.host.registerEvent(ref);
    this.activeRefs.push({ emitter, ref });
  }

  private unregisterAll(): void {
    while (this.activeRefs.length > 0) {
      const next = this.activeRefs.pop();
      if (next === undefined) {
        continue;
      }

      try {
        next.emitter.offref(next.ref);
      } catch (error) {
        console.error("Petsidian failed to unregister a native Obsidian event listener.", error);
        new Notice("Petsidian failed to clean up one native event listener.");
      }
    }
  }
}
