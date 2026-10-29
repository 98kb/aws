import ora, {type Ora} from "ora";

/**
 * Headless runs pass `isEnabled: false` so ora prints plain lines; interactive
 * runs leave it unset so ora keeps its own TTY/CI detection.
 */
export function startSpinner(text: string, interactive: boolean): Ora {
  return ora(interactive ? {text} : {text, isEnabled: false}).start();
}
