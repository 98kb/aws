import type {ChildProcess, StdioOptions} from "node:child_process";
import spawn from "cross-spawn";
import {CommandFailedError} from "./CommandFailedError";
import type {CommandRun, CommandRunner} from "./CommandRunner";
import {printDockerGuidance} from "./printDockerGuidance";

/**
 * Runs one command. The promise settles once: a spawn `error` followed by
 * `close` keeps the first outcome, because later resolve/reject calls are
 * ignored.
 */
export const defaultRunner: CommandRunner = run =>
  new Promise((resolve, reject) => {
    const child = spawn(run.command, run.args, {stdio: stdioFor(run)});
    const stdout = collectStdout(child);
    child.on("error", (error: NodeJS.ErrnoException) =>
      reject(spawnFailure(run, error)),
    );
    child.on("close", code => {
      if (code === 0) {
        resolve({stdout: stdout()});
      } else {
        reject(exitFailure(run, code));
      }
    });
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

function formatCommand({command, args}: CommandRun): string {
  return [command, ...args].join(" ");
}

function spawnFailure(
  run: CommandRun,
  error: NodeJS.ErrnoException,
): CommandFailedError {
  printDockerGuidance(error.code);
  return new CommandFailedError({
    command: formatCommand(run),
    errorCode: error.code ?? "UNKNOWN",
  });
}

function exitFailure(run: CommandRun, code: number | null): CommandFailedError {
  return new CommandFailedError({
    command: formatCommand(run),
    exitCode: code ?? undefined,
  });
}
