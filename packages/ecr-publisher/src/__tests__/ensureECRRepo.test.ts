import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {
  CreateRepositoryCommand,
  DescribeRepositoriesCommand,
} from "@aws-sdk/client-ecr";
import {
  CreateRepositoryCommand as PublicCreateRepositoryCommand,
  DescribeRepositoriesCommand as PublicDescribeRepositoriesCommand,
} from "@aws-sdk/client-ecr-public";
import {EventEmitter} from "node:events";
import chalk from "chalk";
import prompts from "prompts";
import type {Context} from "../Context";
import type {PublisherSettings} from "../PublisherSettings";
import {normalizePublisherSettings} from "../normalizePublisherSettings";
import {ensureECRRepo} from "../ensureECRRepo";
import {PublishCancelledError, RepositoryMissingError} from "../errors";

const spinner = vi.hoisted(() => {
  const value = {start: vi.fn(() => value), stop: vi.fn()};
  return value;
});

vi.mock("ora", () => ({default: vi.fn(() => spinner)}));
vi.mock("prompts", () => ({default: vi.fn()}));

type Describe = "exists" | "missing" | "denied";
type CommandClass = abstract new (...args: never[]) => unknown;

function namedError(name: string): Error {
  return Object.assign(new Error(`${name} message`), {name});
}

const deniedError = namedError("AccessDeniedException");

function makeClient(
  describeCommand: CommandClass,
  createCommand: CommandClass,
  describe: Describe,
) {
  const send = vi.fn((command: unknown) => {
    if (command instanceof describeCommand) {
      if (describe === "exists") return Promise.resolve({repositories: []});
      return Promise.reject(
        describe === "missing"
          ? namedError("RepositoryNotFoundException")
          : deniedError,
      );
    }
    if (command instanceof createCommand) return Promise.resolve({});
    return Promise.reject(new Error("unexpected command"));
  });
  const created = () =>
    send.mock.calls.some(([command]) => command instanceof createCommand);
  return {client: {send}, created};
}

const variants = [
  {
    name: "private ECR",
    isPublic: false,
    label: "ECR repo",
    describeCommand: DescribeRepositoriesCommand,
    createCommand: CreateRepositoryCommand,
  },
  {
    name: "public ECR",
    isPublic: true,
    label: "Public ECR repo",
    describeCommand: PublicDescribeRepositoriesCommand,
    createCommand: PublicCreateRepositoryCommand,
  },
] as const;

describe.each(variants)(
  "ensureECRRepo — $name",
  ({isPublic, label, describeCommand, createCommand}) => {
    let target: ReturnType<typeof makeClient>;
    let other: ReturnType<typeof makeClient>;

    function setup(describe: Describe, settings: PublisherSettings): Context {
      target = makeClient(describeCommand, createCommand, describe);
      other = makeClient(describeCommand, createCommand, "exists");
      const [ecr, ecrPublic] = isPublic
        ? [other.client, target.client]
        : [target.client, other.client];
      return {
        ecr,
        ecrPublic,
        currentVersion: "1.0.0",
        newVersion: "1.1.0",
        options: {
          repo: "my-repo",
          bump: "patch",
          dockerArgs: [],
          versionPrefix: "",
          public: isPublic,
        },
        settings: normalizePublisherSettings(settings),
      } as unknown as Context;
    }

    beforeEach(() => {
      vi.clearAllMocks();
      const stdin = Object.assign(new EventEmitter(), {isTTY: true});
      vi.spyOn(process, "stdin", "get").mockReturnValue(stdin as never);
    });
    afterEach(() => vi.restoreAllMocks());

    it.each(["prompt", "always", "never"] as const)(
      "continues without creating when the repo exists (createRepo: %s)",
      async createRepo => {
        const confirm = vi.fn();
        const ctx = setup("exists", {createRepo, confirm});
        await expect(ensureECRRepo(ctx)).resolves.toBeUndefined();
        expect(target.created()).toBe(false);
        expect(confirm).not.toHaveBeenCalled();
      },
    );

    it("uses only the matching client", async () => {
      const ctx = setup("missing", {createRepo: "always"});
      await ensureECRRepo(ctx);
      expect(target.client.send).toHaveBeenCalledTimes(2);
      expect(other.client.send).not.toHaveBeenCalled();
    });

    it("propagates a non-not-found existence error without creating (AE5)", async () => {
      const ctx = setup("denied", {createRepo: "always"});
      await expect(ensureECRRepo(ctx)).rejects.toBe(deniedError);
      expect(target.created()).toBe(false);
      expect(spinner.stop).toHaveBeenCalled();
    });

    it("rejects headless default policy with yes: true without creating (AE3)", async () => {
      const ctx = setup("missing", {interactive: false, yes: true});
      const result = ensureECRRepo(ctx);
      await expect(result).rejects.toBeInstanceOf(RepositoryMissingError);
      await expect(result).rejects.toMatchObject({repo: "my-repo"});
      expect(target.created()).toBe(false);
    });

    it.each([true, false])(
      "rejects with RepositoryMissingError under 'never' (interactive: %s)",
      async interactive => {
        const confirm = vi.fn();
        const ctx = setup("missing", {
          createRepo: "never",
          interactive,
          confirm,
        });
        await expect(ensureECRRepo(ctx)).rejects.toBeInstanceOf(
          RepositoryMissingError,
        );
        expect(target.created()).toBe(false);
        expect(confirm).not.toHaveBeenCalled();
      },
    );

    it.each([true, false])(
      "creates without asking under 'always' (interactive: %s)",
      async interactive => {
        const confirm = vi.fn();
        const ctx = setup("missing", {
          createRepo: "always",
          interactive,
          confirm,
        });
        await ensureECRRepo(ctx);
        const createCall = target.client.send.mock.calls.find(
          ([command]) => command instanceof createCommand,
        );
        expect(createCall?.[0]).toMatchObject({
          input: {repositoryName: "my-repo"},
        });
        expect(confirm).not.toHaveBeenCalled();
        expect(prompts).not.toHaveBeenCalled();
      },
    );

    it("asks the confirm callback with step create-repo, then creates (AE4)", async () => {
      const confirm = vi.fn().mockResolvedValue(true);
      const ctx = setup("missing", {confirm});
      await ensureECRRepo(ctx);
      expect(confirm).toHaveBeenCalledWith(
        `${label} my-repo not found. Create it?`,
        {step: "create-repo"},
      );
      expect(target.created()).toBe(true);
    });

    it("rejects with PublishCancelledError when the callback declines", async () => {
      const ctx = setup("missing", {confirm: vi.fn().mockResolvedValue(false)});
      await expect(ensureECRRepo(ctx)).rejects.toBeInstanceOf(
        PublishCancelledError,
      );
      expect(target.created()).toBe(false);
    });

    it("rejects headless default policy without calling confirm", async () => {
      const confirm = vi.fn().mockResolvedValue(true);
      const ctx = setup("missing", {interactive: false, confirm});
      await expect(ensureECRRepo(ctx)).rejects.toBeInstanceOf(
        RepositoryMissingError,
      );
      expect(confirm).not.toHaveBeenCalled();
      expect(target.created()).toBe(false);
    });

    it("shows today's prompt text in the built-in prompt, then creates", async () => {
      vi.mocked(prompts).mockResolvedValue({confirm: true});
      const ctx = setup("missing", {});
      await ensureECRRepo(ctx);
      expect(vi.mocked(prompts).mock.calls[0][0]).toMatchObject({
        type: "confirm",
        message: chalk.gray(
          `${label} ${chalk.blue("my-repo")} not found. Create it?`,
        ),
        initial: true,
      });
      expect(target.created()).toBe(true);
    });
  },
);

describe("ensureECRRepo — client guards", () => {
  function contextWithoutClients(isPublic: boolean): Context {
    return {
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: isPublic,
      },
      settings: normalizePublisherSettings(),
    } as unknown as Context;
  }

  it("throws when ecr is not set", async () => {
    await expect(ensureECRRepo(contextWithoutClients(false))).rejects.toThrow(
      "ECRClient is required for private ECR",
    );
  });

  it("throws when ecrPublic is not set", async () => {
    await expect(ensureECRRepo(contextWithoutClients(true))).rejects.toThrow(
      "ECRPublicClient is required when --public is set",
    );
  });
});
