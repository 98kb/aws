import {EcrPublisherError} from "./EcrPublisherError";

export type CommandFailure = {
  command: string;
  exitCode?: number;
  errorCode?: string;
};

export class CommandFailedError extends EcrPublisherError {
  override name = "CommandFailedError";
  readonly command: string;
  readonly exitCode?: number;
  readonly errorCode?: string;

  constructor({command, exitCode, errorCode}: CommandFailure) {
    super(
      "COMMAND_FAILED",
      `Command failed: ${command} (${describeFailure(exitCode, errorCode)})`,
    );
    this.command = command;
    this.exitCode = exitCode;
    this.errorCode = errorCode;
  }
}

function describeFailure(exitCode?: number, errorCode?: string): string {
  return errorCode ? `spawn error ${errorCode}` : `exit code ${exitCode}`;
}
