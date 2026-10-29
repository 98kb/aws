/** One command for a {@link CommandRunner} to run. */
export type CommandRun = {
  command: string;
  args: string[];
  /** Written to the child's stdin, then stdin is closed. Never logged. */
  input?: string;
  /** Inherit stdin when no `input` is given; headless runs get none. */
  interactive: boolean;
  /** Pipe stdout, echo it to `process.stdout`, and return it as `stdout`. */
  captureStdout?: boolean;
};
