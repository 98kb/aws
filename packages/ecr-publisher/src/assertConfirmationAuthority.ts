import {ConfirmationRequiredError} from "./ConfirmationRequiredError";
import {canPrompt} from "./canPrompt";
import type {ResolvedPublisherSettings} from "./normalizePublisherSettings";

/**
 * Preflight run before any AWS or Docker call: rejects when nothing could
 * answer the build confirmation (no `confirm`, no `yes`, and no usable
 * built-in prompt).
 */
export function assertConfirmationAuthority(
  settings: ResolvedPublisherSettings,
): void {
  if (!isPreAnswered(settings) && !canPrompt(settings)) {
    throw new ConfirmationRequiredError("build");
  }
}

function isPreAnswered({confirm, yes}: ResolvedPublisherSettings): boolean {
  return confirm !== undefined || yes;
}
