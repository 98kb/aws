import type {ConfirmStep} from "./ConfirmStepName";

/**
 * Answers a confirmation. Return `true` or nothing to proceed, `false` to
 * decline. Anything thrown propagates out of `publish()` unchanged.
 */
export type ConfirmFn = (
  message: string,
  meta: {step: ConfirmStep},
) => boolean | void | Promise<boolean | void>;
