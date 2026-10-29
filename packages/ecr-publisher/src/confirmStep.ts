import prompts from "prompts";
import type {Context} from "./Context";
import type {ConfirmFn} from "./ConfirmFn";
import type {ConfirmStep} from "./ConfirmStepName";
import type {ResolvedPublisherSettings} from "./normalizePublisherSettings";
import {ConfirmationRequiredError} from "./ConfirmationRequiredError";
import {PublishCancelledError} from "./PublishCancelledError";

/**
 * Answers one confirmation in order: the `confirm` callback, `yes` (build and
 * push only), then the built-in terminal prompt. Throws
 * `PublishCancelledError` on decline. `promptMessage` is the styled text shown
 * by the built-in prompt; the callback always gets the plain `message`.
 */
export async function confirmStep(
  context: Context,
  step: ConfirmStep,
  message: string,
  promptMessage: string = message,
): Promise<void> {
  const approved = await resolveApproval(context.settings, step, {
    message,
    promptMessage,
  });
  if (!approved) {
    throw new PublishCancelledError(step);
  }
}

type Messages = {message: string; promptMessage: string};

function resolveApproval(
  settings: ResolvedPublisherSettings,
  step: ConfirmStep,
  {message, promptMessage}: Messages,
): Promise<boolean> {
  if (settings.confirm) {
    return callbackApproves(settings.confirm, step, message);
  }
  if (isAutoApproved(settings, step)) {
    return Promise.resolve(true);
  }
  return promptApproves(settings.interactive, step, promptMessage);
}

async function callbackApproves(
  confirm: ConfirmFn,
  step: ConfirmStep,
  message: string,
): Promise<boolean> {
  return (await confirm(message, {step})) !== false;
}

function isAutoApproved(
  settings: ResolvedPublisherSettings,
  step: ConfirmStep,
): boolean {
  return settings.yes && step !== "create-repo";
}

function promptApproves(
  interactive: boolean,
  step: ConfirmStep,
  message: string,
): Promise<boolean> {
  if (!interactive || !process.stdin.isTTY) {
    throw new ConfirmationRequiredError(step);
  }
  return rejectOnStdinEnd(builtInPrompt(message), step);
}

async function builtInPrompt(message: string): Promise<boolean> {
  let cancelled = false;
  const {confirm} = await prompts(
    {type: "confirm", name: "confirm", message, initial: true},
    {
      onCancel: () => {
        cancelled = true;
      },
    },
  );
  return !cancelled && confirm === true;
}

/**
 * `prompts` can wait forever once stdin closes, so the answer is raced against
 * stdin `end`/`close`; a later answer is ignored.
 */
function rejectOnStdinEnd(
  answer: Promise<boolean>,
  step: ConfirmStep,
): Promise<boolean> {
  const {stdin} = process;
  let stopListening: (() => void) | undefined;
  const ended = new Promise<never>((_resolve, reject) => {
    const onEnd = () => reject(new ConfirmationRequiredError(step));
    stdin.once("end", onEnd).once("close", onEnd);
    stopListening = () => stdin.off("end", onEnd).off("close", onEnd);
  });
  return Promise.race([answer, ended]).finally(() => stopListening?.());
}
