import type {ResolvedPublisherSettings} from "./normalizePublisherSettings";

/**
 * The built-in terminal prompt can answer only in interactive runs whose stdin
 * is a TTY that has not already ended or closed (an ended stream never emits
 * `end`/`close` again, so a prompt on it would wait forever).
 */
export function canPrompt({interactive}: ResolvedPublisherSettings): boolean {
  return interactive && isOpenTTY(process.stdin);
}

function isOpenTTY(stdin: NodeJS.ReadStream): boolean {
  return stdin.isTTY === true && isOpen(stdin);
}

function isOpen(stdin: NodeJS.ReadStream): boolean {
  return !stdin.readableEnded && !stdin.destroyed;
}
