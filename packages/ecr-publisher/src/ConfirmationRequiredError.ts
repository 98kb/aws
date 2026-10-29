import type {ConfirmStep} from "./ConfirmStepName";
import {EcrPublisherError} from "./EcrPublisherError";

export class ConfirmationRequiredError extends EcrPublisherError {
  override name = "ConfirmationRequiredError";

  constructor(readonly step: ConfirmStep) {
    super(
      "CONFIRMATION_REQUIRED",
      `Confirmation required for "${step}": pass a confirm callback or yes: true, or run interactively in a terminal.`,
    );
  }
}
