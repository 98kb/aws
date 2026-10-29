import type {CommandRun} from "./CommandRun";

export type * from "./CommandRun";

/**
 * Runs one Docker command. Resolves with the captured stdout (empty unless
 * `captureStdout` is set); rejects when the command fails.
 */
export type CommandRunner = (run: CommandRun) => Promise<{stdout: string}>;
