import {
  type MockInstance,
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import {CommanderError} from "commander";
import {cli} from "../cli";
import {exitCodeFor} from "../exitCodeFor";
import {createEcrPublisher} from "../createEcrPublisher";
import {
  ConfirmationRequiredError,
  PublishCancelledError,
  RepositoryMissingError,
} from "../errors";

const publish = vi.fn();

vi.mock("../createEcrPublisher", () => ({
  createEcrPublisher: vi.fn(() => ({publish})),
}));

const DIGEST = `sha256:${"a".repeat(64)}`;

function run(...args: string[]) {
  return cli()
    .exitOverride()
    .configureOutput({writeErr: () => undefined})
    .parseAsync(["node", "ecr-publisher", "--repo", "my-repo", ...args]);
}

describe("cli", () => {
  let exit: MockInstance<typeof process.exit>;
  let log: MockInstance<typeof console.log>;

  beforeEach(() => {
    publish.mockReset();
    vi.mocked(createEcrPublisher).mockClear();
    publish.mockResolvedValue({newVersion: "1.3.0", digest: DIGEST});
    exit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps no flags to the default settings", async () => {
    await run();
    expect(vi.mocked(createEcrPublisher).mock.calls[0]?.[1]).toEqual({
      yes: false,
      interactive: true,
      createRepo: "prompt",
    });
  });

  it("maps --yes --non-interactive --create-repo always to settings", async () => {
    await run("--yes", "--non-interactive", "--create-repo", "always");
    expect(vi.mocked(createEcrPublisher).mock.calls[0]?.[1]).toEqual({
      yes: true,
      interactive: false,
      createRepo: "always",
    });
  });

  it("rejects an unknown --create-repo value with commander's invalid-choice error", async () => {
    await expect(run("--create-repo", "maybe")).rejects.toMatchObject({
      constructor: CommanderError,
      code: "commander.invalidArgument",
    });
    expect(publish).not.toHaveBeenCalled();
  });

  it("keeps settings flags out of the options passed to publish()", async () => {
    await run("--yes", "--non-interactive", "--create-repo", "never");
    const options = publish.mock.calls[0]?.[0];
    expect(options).toMatchObject({repo: "my-repo", bump: "minor"});
    expect(options).not.toHaveProperty("yes");
    expect(options).not.toHaveProperty("nonInteractive");
    expect(options).not.toHaveProperty("createRepo");
  });

  it("prints the pushed version and digest on success", async () => {
    await run("--yes");
    expect(log).toHaveBeenCalledWith(expect.stringContaining("1.3.0"));
    expect(log).toHaveBeenCalledWith(expect.stringContaining(DIGEST));
    expect(exit).not.toHaveBeenCalled();
  });

  it("exits 0 when the user declines a prompt (AE7)", async () => {
    publish.mockRejectedValue(new PublishCancelledError("build"));
    await run();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("exits 1 when publishing fails", async () => {
    publish.mockRejectedValue(new Error("boom"));
    await run();
    expect(exit).toHaveBeenCalledWith(1);
  });
});

describe("exitCodeFor", () => {
  it("returns 0 for a cancellation", () => {
    expect(exitCodeFor(new PublishCancelledError("build"))).toBe(0);
  });

  it.each([
    new ConfirmationRequiredError("build"),
    new RepositoryMissingError("my-repo"),
    new Error("boom"),
  ])("returns 1 for %s", error => {
    expect(exitCodeFor(error)).toBe(1);
  });
});
