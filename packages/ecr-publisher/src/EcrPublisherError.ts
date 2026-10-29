import type {EcrPublisherErrorCode} from "./EcrPublisherErrorCode";

export class EcrPublisherError extends Error {
  override name = "EcrPublisherError";

  constructor(
    readonly code: EcrPublisherErrorCode,
    message: string,
  ) {
    super(message);
  }
}
