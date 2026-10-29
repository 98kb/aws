import type {ConfirmStep} from "./ConfirmStepName";
import {EcrPublisherError} from "./EcrPublisherError";

export class PublishCancelledError extends EcrPublisherError {
  override name = "PublishCancelledError";

  constructor(readonly step: ConfirmStep) {
    super("CANCELLED", `Publish cancelled at "${step}".`);
  }
}
