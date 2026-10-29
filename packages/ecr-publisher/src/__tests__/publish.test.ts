import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {
  type ECRClient,
  DescribeImagesCommand,
  DescribeRepositoriesCommand,
  GetAuthorizationTokenCommand,
} from "@aws-sdk/client-ecr";
import {
  type ECRPUBLICClient,
  DescribeImagesCommand as PublicDescribeImagesCommand,
  DescribeRepositoriesCommand as PublicDescribeRepositoriesCommand,
  GetAuthorizationTokenCommand as PublicGetAuthorizationTokenCommand,
} from "@aws-sdk/client-ecr-public";
import {EventEmitter} from "node:events";
import prompts from "prompts";
import type {CommandRun} from "../CommandRun";
import type {Context} from "../Context";
import type {PublisherSettings} from "../PublisherSettings";
import {
  CommandFailedError,
  ConfirmationRequiredError,
  DigestNotFoundError,
  EcrPublisher,
  PublicEcrPublisher,
  PublishCancelledError,
  createEcrPublisher,
  createPublicEcrPublisher,
} from "..";
import {defaultRunner} from "../defaultRunner";

vi.mock("prompts", () => ({
  default: vi.fn(() => {
    throw new Error("the built-in prompt must not be used");
  }),
}));
vi.mock("ora", () => {
  const spinner = {start: () => spinner, stop: () => undefined};
  return {default: () => spinner};
});

const FIRST_DIGEST = `sha256:${"a".repeat(64)}`;
const SECOND_DIGEST = `sha256:${"0123456789abcdef".repeat(4)}`;
const PUSH_OUTPUT = [
  "abc123: Pushed",
  `1.3.0: digest: ${FIRST_DIGEST} size: 1573`,
  `1.3.0: digest: ${SECOND_DIGEST} size: 1573`,
].join("\n");
const REGISTRY_HOST = "123456.dkr.ecr.us-east-1.amazonaws.com";
const PRIVATE_TAG = `${REGISTRY_HOST}/my-repo:1.3.0`;
const OPTIONS = {
  repo: "my-repo",
  bump: "minor" as const,
  dockerArgs: [] as string[],
  versionPrefix: "",
  public: false,
};
const IMAGES = {
  imageDetails: [{imageDigest: "sha256:x", imageTags: ["1.2.0"]}],
};

function makePrivateClient() {
  const send = vi.fn((command: unknown) => {
    if (command instanceof DescribeRepositoriesCommand) {
      return Promise.resolve({repositories: [{}]});
    }
    if (command instanceof DescribeImagesCommand) {
      return Promise.resolve(IMAGES);
    }
    if (command instanceof GetAuthorizationTokenCommand) {
      return Promise.resolve({
        authorizationData: [
          {
            authorizationToken: Buffer.from("AWS:secret").toString("base64"),
            proxyEndpoint: `https://${REGISTRY_HOST}`,
          },
        ],
      });
    }
    return Promise.reject(new Error("unexpected command"));
  });
  const sent = (commandClass: abstract new (...args: never[]) => unknown) =>
    send.mock.calls.some(([command]) => command instanceof commandClass);
  return {client: {send} as unknown as ECRClient, send, sent};
}

function makePublicClient() {
  const send = vi.fn((command: unknown) => {
    if (command instanceof PublicDescribeRepositoriesCommand) {
      return Promise.resolve({repositories: [{}]});
    }
    if (command instanceof PublicDescribeImagesCommand) {
      return Promise.resolve(IMAGES);
    }
    if (command instanceof PublicGetAuthorizationTokenCommand) {
      return Promise.resolve({
        authorizationData: {
          authorizationToken: Buffer.from("AWS:pub").toString("base64"),
        },
      });
    }
    return Promise.reject(new Error("unexpected command"));
  });
  return {client: {send} as unknown as ECRPUBLICClient, send};
}

function makeRunner(pushOutput = PUSH_OUTPUT) {
  return vi.fn((run: CommandRun) =>
    Promise.resolve({stdout: run.args[0] === "push" ? pushOutput : ""}),
  );
}

function subcommands(runner: ReturnType<typeof makeRunner>): string[] {
  return runner.mock.calls.map(([run]) => run.args[0]);
}

function setTTY(isTTY: boolean) {
  const stdin = Object.assign(new EventEmitter(), {isTTY});
  vi.spyOn(process, "stdin", "get").mockReturnValue(stdin as never);
}

function privatePublisher(settings: PublisherSettings) {
  const ecr = makePrivateClient();
  const runner = makeRunner();
  const publisher = new EcrPublisher(ecr.client, {runner, ...settings});
  return {publisher, ecr, runner};
}

describe("publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTTY(true);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("headless yes run resolves with the last digest and the new version (AE1)", async () => {
    const {publisher, runner} = privatePublisher({
      interactive: false,
      yes: true,
    });
    await expect(publisher.publish(OPTIONS)).resolves.toEqual({
      previousVersion: "1.2.0",
      newVersion: "1.3.0",
      digest: SECOND_DIGEST,
    });
    expect(subcommands(runner)).toEqual(["build", "login", "tag", "push"]);
    const runs = runner.mock.calls.map(([run]) => run);
    expect(runs.every(run => run.interactive === false)).toBe(true);
    expect(runs[1]).toMatchObject({
      input: "secret",
      args: ["login", "--username", "AWS", "--password-stdin", REGISTRY_HOST],
    });
    expect(runs[3]).toMatchObject({
      args: ["push", PRIVATE_TAG],
      captureStdout: true,
    });
    expect(prompts).not.toHaveBeenCalled();
  });

  it("rejects a headless run without confirm or yes before any call (AE2)", async () => {
    const {publisher, ecr, runner} = privatePublisher({interactive: false});
    await expect(publisher.publish(OPTIONS)).rejects.toBeInstanceOf(
      ConfirmationRequiredError,
    );
    expect(ecr.send).not.toHaveBeenCalled();
    expect(runner).not.toHaveBeenCalled();
  });

  it("rejects an interactive run without a TTY before any call", async () => {
    setTTY(false);
    const {publisher, ecr, runner} = privatePublisher({});
    await expect(publisher.publish(OPTIONS)).rejects.toBeInstanceOf(
      ConfirmationRequiredError,
    );
    expect(ecr.send).not.toHaveBeenCalled();
    expect(runner).not.toHaveBeenCalled();
    expect(prompts).not.toHaveBeenCalled();
  });

  it("rejects before any client or runner call when a TTY stdin has already closed", async () => {
    Object.assign(process.stdin, {readableEnded: true, destroyed: true});
    const {publisher, ecr, runner} = privatePublisher({});
    await expect(publisher.publish(OPTIONS)).rejects.toBeInstanceOf(
      ConfirmationRequiredError,
    );
    expect(ecr.send).not.toHaveBeenCalled();
    expect(runner).not.toHaveBeenCalled();
    expect(prompts).not.toHaveBeenCalled();
  });

  it("rejects with DigestNotFoundError naming the pushed tag after the push (AE6)", async () => {
    const ecr = makePrivateClient();
    const runner = makeRunner("abc123: Pushed\n");
    const publisher = new EcrPublisher(ecr.client, {runner, yes: true});
    const result = publisher.publish(OPTIONS);
    await expect(result).rejects.toBeInstanceOf(DigestNotFoundError);
    await expect(result).rejects.toMatchObject({imageTag: PRIVATE_TAG});
    expect(subcommands(runner)).toContain("push");
  });

  it("omits previousVersion and skips DescribeImages with overrideVersion", async () => {
    const {publisher, ecr} = privatePublisher({yes: true});
    const result = await publisher.publish({
      ...OPTIONS,
      overrideVersion: "9.0.0",
    });
    expect(result).toEqual({newVersion: "9.0.0", digest: SECOND_DIGEST});
    expect("previousVersion" in result).toBe(false);
    expect(ecr.sent(DescribeImagesCommand)).toBe(false);
  });

  it("runs hooks in order, chaining contexts, with beforeBuild after the build confirmation", async () => {
    const events: string[] = [];
    const received: Context[] = [];
    const returned: Context[] = [];
    const hook = (name: string) => (context: Context) => {
      events.push(name);
      received.push(context);
      const next = {...context};
      returned.push(next);
      return next;
    };
    const runner = vi.fn((run: CommandRun) => {
      events.push(`run:${run.args[0]}`);
      return Promise.resolve({stdout: PUSH_OUTPUT});
    });
    const confirm = vi.fn((_message: string, {step}: {step: string}) => {
      events.push(`confirm:${step}`);
    });
    const publisher = new EcrPublisher(makePrivateClient().client, {
      runner,
      confirm,
    })
      .afterVersionBump(hook("afterVersionBump"))
      .beforeBuild(hook("beforeBuild"))
      .afterBuild(hook("afterBuild"));
    await publisher.publish(OPTIONS);
    expect(events.slice(0, 5)).toEqual([
      "afterVersionBump",
      "confirm:build",
      "beforeBuild",
      "run:build",
      "afterBuild",
    ]);
    expect(received[1]).toBe(returned[0]);
    expect(received[2]).toBe(returned[1]);
    expect(publisher.context).toBe(returned[2]);
  });

  it("rejects with PublishCancelledError when confirm declines the push", async () => {
    const confirm = vi.fn(
      (_message: string, {step}: {step: string}) => step !== "push",
    );
    const {publisher, runner} = privatePublisher({confirm});
    await expect(publisher.publish(OPTIONS)).rejects.toBeInstanceOf(
      PublishCancelledError,
    );
    expect(subcommands(runner)).toEqual(["build", "login", "tag"]);
  });

  it("propagates a build failure without requesting ECR auth", async () => {
    const failure = new CommandFailedError({
      command: "docker build",
      exitCode: 1,
    });
    const ecr = makePrivateClient();
    const runner = vi.fn(() => Promise.reject(failure));
    const publisher = new EcrPublisher(ecr.client, {runner, yes: true});
    await expect(publisher.publish(OPTIONS)).rejects.toBe(failure);
    expect(ecr.sent(GetAuthorizationTokenCommand)).toBe(false);
  });

  it("publishes headless to public ECR with the digest from push output", async () => {
    const ecrPublic = makePublicClient();
    const runner = makeRunner();
    const publisher = new PublicEcrPublisher(ecrPublic.client, {
      runner,
      interactive: false,
      yes: true,
    });
    const result = await publisher.publish({...OPTIONS, alias: "myalias"});
    expect(result.digest).toBe(SECOND_DIGEST);
    const login = runner.mock.calls[1][0];
    expect(login.args.at(-1)).toBe("public.ecr.aws");
    expect(runner.mock.calls[3][0].args).toEqual([
      "push",
      "public.ecr.aws/myalias/my-repo:1.3.0",
    ]);
  });
});

describe("publisher construction", () => {
  const ecr = {} as ECRClient;
  const ecrPublic = {} as ECRPUBLICClient;
  const defaults = {
    interactive: true,
    yes: false,
    createRepo: "prompt",
    runner: defaultRunner,
  };

  it("one-argument constructors and factories use 2.x defaults", () => {
    for (const publisher of [
      new EcrPublisher(ecr),
      new PublicEcrPublisher(ecrPublic),
      createEcrPublisher(ecr),
      createPublicEcrPublisher(ecrPublic),
    ]) {
      expect(publisher.context.settings).toEqual(defaults);
    }
  });

  it("factories forward settings", () => {
    const settings = {
      yes: true,
      interactive: false,
      createRepo: "never",
    } as const;
    expect(createEcrPublisher(ecr, settings).context.settings).toMatchObject(
      settings,
    );
    expect(
      createPublicEcrPublisher(ecrPublic, settings).context.settings,
    ).toMatchObject(settings);
  });
});
