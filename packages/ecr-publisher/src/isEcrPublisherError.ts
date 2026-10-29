import type {EcrPublisherError} from "./EcrPublisherError";
import type {EcrPublisherErrorCode} from "./EcrPublisherErrorCode";

const knownCodes: Record<EcrPublisherErrorCode, true> = {
  CONFIRMATION_REQUIRED: true,
  CANCELLED: true,
  REPO_MISSING: true,
  DIGEST_NOT_FOUND: true,
  COMMAND_FAILED: true,
};

/**
 * Checks `code` rather than `instanceof`, so errors from a second copy of the
 * package are still recognised.
 */
export function isEcrPublisherError(
  error: unknown,
  code?: EcrPublisherErrorCode,
): error is EcrPublisherError {
  const actual = (error as {code?: unknown} | undefined)?.code;
  return code ? actual === code : Object.hasOwn(knownCodes, String(actual));
}
