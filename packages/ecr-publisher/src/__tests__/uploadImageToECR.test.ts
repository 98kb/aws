import {describe, it, expect, vi, beforeEach} from "vitest";
import {GetAuthorizationTokenCommand} from "@aws-sdk/client-ecr";
import {
  GetAuthorizationTokenCommand as GetPublicAuthorizationTokenCommand,
  DescribeRegistriesCommand,
} from "@aws-sdk/client-ecr-public";
import type {Context} from "../Context";
import {uploadImageToECR} from "../uploadImageToECR";

vi.mock("../executeCommand", () => ({
  executeCommand: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../executeCommandWithStdin", () => ({
  executeCommandWithStdin: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../promptConfirmOrExit", () => ({
  promptConfirmOrExit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../printCommand", () => ({printCommand: vi.fn()}));

const PRIVATE_AUTH_TOKEN = Buffer.from("AWS:password").toString("base64");
const PUBLIC_AUTH_TOKEN = Buffer.from("AWS:pubpassword").toString("base64");
const PROXY_ENDPOINT = "https://123456.dkr.ecr.us-east-1.amazonaws.com";
const REGISTRY_HOST = "123456.dkr.ecr.us-east-1.amazonaws.com";

function makePrivateClient() {
  const send = vi.fn().mockResolvedValue({
    authorizationData: [
      {
        authorizationToken: PRIVATE_AUTH_TOKEN,
        proxyEndpoint: PROXY_ENDPOINT,
      },
    ],
  });
  return {send};
}

function makePublicClient(alias?: string) {
  const send = vi.fn().mockImplementation((cmd: unknown) => {
    if (cmd instanceof GetPublicAuthorizationTokenCommand) {
      return Promise.resolve({
        authorizationData: {authorizationToken: PUBLIC_AUTH_TOKEN},
      });
    }
    if (cmd instanceof DescribeRegistriesCommand) {
      return Promise.resolve({
        registries: [{aliases: [{name: alias ?? "detected-alias"}]}],
      });
    }
    return Promise.resolve({});
  });
  return {send};
}

function makeContext(
  overrides: Partial<Context> & {options: Context["options"]},
): Context {
  return {
    currentVersion: "1.0.0",
    newVersion: "1.1.0",
    ...overrides,
  } as Context;
}

describe("uploadImageToECR — private ECR", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls GetAuthorizationTokenCommand on the ECRClient", async () => {
    const ecr = makePrivateClient();
    const ctx = makeContext({
      ecr: ecr as never,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: false,
      },
    });
    await uploadImageToECR(ctx, "local-image:latest");
    expect(ecr.send.mock.calls[0][0]).toBeInstanceOf(
      GetAuthorizationTokenCommand,
    );
  });

  it("returns the correct private ECR image tag", async () => {
    const ecr = makePrivateClient();
    const ctx = makeContext({
      ecr: ecr as never,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: false,
      },
    });
    const result = await uploadImageToECR(ctx, "local-image:latest");
    expect(result).toBe(`${REGISTRY_HOST}/my-repo:1.1.0`);
  });

  it("does not call the public ECR client", async () => {
    const ecr = makePrivateClient();
    const ecrPublic = makePublicClient();
    const ctx = makeContext({
      ecr: ecr as never,
      ecrPublic: ecrPublic as never,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: false,
      },
    });
    await uploadImageToECR(ctx, "local-image:latest");
    expect(ecrPublic.send).not.toHaveBeenCalled();
  });
});

describe("uploadImageToECR — public ECR with explicit alias", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the correct public ECR image tag", async () => {
    const ecrPublic = makePublicClient("myalias");
    const ctx = makeContext({
      ecrPublic: ecrPublic as never,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: true,
        alias: "myalias",
      },
    });
    const result = await uploadImageToECR(ctx, "local-image:latest");
    expect(result).toBe("public.ecr.aws/myalias/my-repo:1.1.0");
  });

  it("does not call DescribeRegistriesCommand when alias is provided", async () => {
    const ecrPublic = makePublicClient("myalias");
    const ctx = makeContext({
      ecrPublic: ecrPublic as never,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: true,
        alias: "myalias",
      },
    });
    await uploadImageToECR(ctx, "local-image:latest");
    const commandTypes = ecrPublic.send.mock.calls.map(
      ([cmd]) => cmd.constructor.name,
    );
    expect(commandTypes).not.toContain("DescribeRegistriesCommand");
  });

  it("does not call the private ECR client", async () => {
    const ecr = makePrivateClient();
    const ecrPublic = makePublicClient("myalias");
    const ctx = makeContext({
      ecr: ecr as never,
      ecrPublic: ecrPublic as never,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: true,
        alias: "myalias",
      },
    });
    await uploadImageToECR(ctx, "local-image:latest");
    expect(ecr.send).not.toHaveBeenCalled();
  });
});

describe("uploadImageToECR — public ECR without alias (auto-detect)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls DescribeRegistriesCommand to detect alias", async () => {
    const ecrPublic = makePublicClient("auto-alias");
    const ctx = makeContext({
      ecrPublic: ecrPublic as never,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: true,
      },
    });
    await uploadImageToECR(ctx, "local-image:latest");
    const commandTypes = ecrPublic.send.mock.calls.map(
      ([cmd]) => cmd.constructor.name,
    );
    expect(commandTypes).toContain("DescribeRegistriesCommand");
  });

  it("uses the detected alias in the image tag", async () => {
    const ecrPublic = makePublicClient("auto-alias");
    const ctx = makeContext({
      ecrPublic: ecrPublic as never,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: true,
      },
    });
    const result = await uploadImageToECR(ctx, "local-image:latest");
    expect(result).toBe("public.ecr.aws/auto-alias/my-repo:1.1.0");
  });
});
