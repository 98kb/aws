import {isEcrPublisherError} from "./isEcrPublisherError";

/** Cancellation exits 0; every other error exits 1. */
export function exitCodeFor(error: unknown): number {
  return isEcrPublisherError(error, "CANCELLED") ? 0 : 1;
}
