import type { PetActionAnimationId } from "./animation";

export const COMPANION_EVENT_TYPES = [
  "thinking",
  "tool-running",
  "reviewing",
  "success",
  "failure",
  "attention"
] as const;

export type CompanionEventType = (typeof COMPANION_EVENT_TYPES)[number];

export type CompanionEventDefinition = {
  type: CompanionEventType;
  label: string;
  description: string;
  animationId: PetActionAnimationId;
  defaultBubble: string;
};

export const COMPANION_EVENTS = {
  thinking: {
    type: "thinking",
    label: "Thinking",
    description: "The companion is thinking through the next step.",
    animationId: "waiting",
    defaultBubble: "Thinking..."
  },
  "tool-running": {
    type: "tool-running",
    label: "Tool running",
    description: "A command, build, test, or tool action is in progress.",
    animationId: "running",
    defaultBubble: "Running a tool..."
  },
  reviewing: {
    type: "reviewing",
    label: "Reviewing",
    description: "Changes are being reviewed.",
    animationId: "review",
    defaultBubble: "Reviewing changes..."
  },
  success: {
    type: "success",
    label: "Success",
    description: "The current task or check completed successfully.",
    animationId: "jumping",
    defaultBubble: "Done!"
  },
  failure: {
    type: "failure",
    label: "Failure",
    description: "A command failed or needs attention.",
    animationId: "failed",
    defaultBubble: "Something needs attention."
  },
  attention: {
    type: "attention",
    label: "Attention",
    description: "The companion needs the user to look at something.",
    animationId: "waving",
    defaultBubble: "Need your attention."
  }
} as const satisfies Record<CompanionEventType, CompanionEventDefinition>;

export function isCompanionEventType(value: string | null | undefined): value is CompanionEventType {
  return (
    typeof value === "string" &&
    COMPANION_EVENT_TYPES.includes(value as CompanionEventType)
  );
}
