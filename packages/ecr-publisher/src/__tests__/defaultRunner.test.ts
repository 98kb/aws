import {afterEach, describe, expect, it, vi} from "vitest";
import {CommandFailedError} from "../CommandFailedError";
import {defaultRunner} from "../defaultRunner";

const node = process.execPath;

function script(source: string) {
  return {command: node, args: ["-e", source]};
}

function silenceStdout() {
  return vi.spyOn(process.stdout, "write").mockImplementation(() => true);
}

describe("defaultRunner", () => {
  afterEach(() => vi.restoreAllMocks());

  it("captures stdout and echoes the same bytes to process.stdout", async () => {
    const write = silenceStdout();
    const {stdout} = await defaultRunner({
      ...script("process.stdout.write('a\\nb\\n')"),
      interactive: false,
      captureStdout: true,
    });
    expect(stdout).toBe("a\nb\n");
    const echoed = write.mock.calls.map(([chunk]) => String(chunk)).join("");
    expect(echoed).toContain("a\nb\n");
  });

  it("pipes input to the child's stdin", async () => {
    silenceStdout();
    const {stdout} = await defaultRunner({
      ...script("process.stdin.pipe(process.stdout)"),
      input: "secret",
      interactive: true,
      captureStdout: true,
    });
    expect(stdout).toBe("secret");
  });

  it("gives a headless child no stdin, so reads see EOF", async () => {
    silenceStdout();
    const {stdout} = await defaultRunner({
      ...script(
        "process.stdin.resume();process.stdin.on('end',()=>process.stdout.write('eof'))",
      ),
      interactive: false,
      captureStdout: true,
    });
    expect(stdout).toBe("eof");
  });

  it("rejects with CommandFailedError naming the command on non-zero exit", async () => {
    const run = defaultRunner({
      ...script("process.exit(3)"),
      interactive: false,
    });
    await expect(run).rejects.toBeInstanceOf(CommandFailedError);
    await expect(run).rejects.toMatchObject({
      exitCode: 3,
      message: expect.stringContaining(node),
    });
  });

  it("prints Docker-not-found help and rejects with ENOENT for a missing binary", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const run = defaultRunner({
      command: "ecr-publisher-no-such-binary",
      args: ["push"],
      interactive: false,
    });
    await expect(run).rejects.toMatchObject({
      name: "CommandFailedError",
      errorCode: "ENOENT",
      message: expect.stringContaining("ecr-publisher-no-such-binary push"),
    });
    expect(error).toHaveBeenCalledWith(
      "❌ Docker is not installed or not in PATH!",
    );
  });

  it("never includes input in the error message", async () => {
    const run = defaultRunner({
      ...script("process.exit(1)"),
      input: "hunter2-password",
      interactive: false,
    });
    await expect(run).rejects.toBeInstanceOf(CommandFailedError);
    await run.catch((failure: Error) =>
      expect(failure.message).not.toContain("hunter2-password"),
    );
  });
});
