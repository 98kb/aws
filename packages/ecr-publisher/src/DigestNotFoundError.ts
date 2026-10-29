import {EcrPublisherError} from "./EcrPublisherError";

export class DigestNotFoundError extends EcrPublisherError {
  override name = "DigestNotFoundError";

  constructor(readonly imageTag: string) {
    super(
      "DIGEST_NOT_FOUND",
      `No image digest found in docker push output for ${imageTag}.`,
    );
  }
}
