import type {ChildProcess, StdioOptions} from "node:child_process";
import spawn from "cross-spawn";
import {CommandFailedError} from "./CommandFailedError";
import type {CommandRun, CommandRunner} from "./CommandRunner";
import {printDockerGuidance} from "./printDockerGuidance";

type Outcome = {stdout: string} | CommandFailedError;

export const defaultRunner: CommandRunner = async run =>
  new Promise((resolve, reject) => {
    const settle = settleOnce(resolve, reject);
    const child = spawn(run.command, run.args, {stdio: stdioFor(run)});
    const stdout = collectStdout(child);
    child.on("error", (error: NodeJS.ErrnoException) =>
      settle(spawnFailure(run, error)),
    );
    child.on("close", code =>
      settle(code === 0 ? {stdout: stdout()} : exitFailure(run, code)),
    );
    writeInput(child, run.input);
  });

function stdinFor({
  input,
  interactive,
}: CommandRun): "pipe" | "inherit" | "ignore" {
  if (input !== undefined) {
    return "pipe";
  }
  return interactive ? "inherit" : "ignore";
}

function stdioFor(run: CommandRun): StdioOptions {
  return [stdinFor(run), run.captureStdout ? "pipe" : "inherit", "inherit"];
}

function settleOnce(
  resolve: (value: {stdout: string}) => void,
  reject: (error: CommandFailedError) => void,
): (outcome: Outcome) => void {
  let settled = false;
  return outcome => {
    if (settled) {
      return;
    }
    settled = true;
    if (outcome instanceof CommandFailedError) {
      reject(outcome);
    } else {
      resolve(outcome);
    }
  };
}

function collectStdout(child: ChildProcess): () => string {
  const chunks: Buffer[] = [];
  child.stdout?.on("data", (chunk: Buffer) => {
    process.stdout.write(chunk);
    chunks.push(chunk);
  });
  return () => Buffer.concat(chunks).toString("utf8");
}

function writeInput(child: ChildProcess, input?: string): void {
  if (input !== undefined && child.stdin) {
    // A child that exits without reading stdin raises EPIPE here; the
    // close/error handlers report the failure instead.
    child.stdin.on("error", () => undefined);
    child.stdin.end(input);
  }
}

function describe({command, args}: CommandRun): string {
  return [command, ...args].join(" ");
}

function spawnFailure(
  run: CommandRun,
  error: NodeJS.ErrnoException,
): CommandFailedError {
  printDockerGuidance(error.code);
  return new CommandFailedError({
    command: describe(run),
    errorCode: error.code ?? "UNKNOWN",
  });
}

function exitFailure(run: CommandRun, code: number | null): CommandFailedError {
  return new CommandFailedError({
    command: describe(run),
    exitCode: code ?? undefined,
  });
}
