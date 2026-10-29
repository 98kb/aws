import type {ResolvedPublisherSettings} from "./normalizePublisherSettings";

/** The built-in terminal prompt can answer only in interactive runs with a TTY stdin. */
export function canPrompt({interactive}: ResolvedPublisherSettings): boolean {
  return interactive && process.stdin.isTTY === true;
}
