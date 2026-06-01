import {describe, it, expect, vi, beforeEach} from "vitest";
import type {ECRClient} from "@aws-sdk/client-ecr";
import type {ECRPUBLICClient} from "@aws-sdk/client-ecr-public";
import type {Context} from "../Context";
import {ensureECRRepo} from "../ensureECRRepo";
import {checkEcrRepoExists} from "../checkEcrRepoExists";
import {createEcrRepo} from "../createEcrRepo";
import {checkEcrPublicRepoExists} from "../checkEcrPublicRepoExists";
import {createEcrPublicRepo} from "../createEcrPublicRepo";

vi.mock("ora", () => ({
  default: vi.fn().mockReturnValue({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn(),
  }),
}));
vi.mock("../checkEcrRepoExists", () => ({checkEcrRepoExists: vi.fn()}));
vi.mock("../createEcrRepo", () => ({
  createEcrRepo: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../checkEcrPublicRepoExists", () => ({
  checkEcrPublicRepoExists: vi.fn(),
}));
vi.mock("../createEcrPublicRepo", () => ({
  createEcrPublicRepo: vi.fn().mockResolvedValue(undefined),
}));

const mockEcr = {} as ECRClient;
const mockEcrPublic = {} as ECRPUBLICClient;

function makeContext(overrides: Partial<Context>): Context {
  return {
    currentVersion: "1.0.0",
    newVersion: "1.1.0",
    options: {
      repo: "my-repo",
      bump: "patch",
      dockerArgs: [],
      versionPrefix: "",
      public: false,
    },
    ...overrides,
  } as Context;
}

describe("ensureECRRepo — private ECR", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls checkEcrRepoExists with the ECRClient and repo name", async () => {
    vi.mocked(checkEcrRepoExists).mockResolvedValue(true);
    const ctx = makeContext({ecr: mockEcr});
    await ensureECRRepo(ctx);
    expect(checkEcrRepoExists).toHaveBeenCalledWith(mockEcr, "my-repo");
  });

  it("does not create the repo when it already exists", async () => {
    vi.mocked(checkEcrRepoExists).mockResolvedValue(true);
    await ensureECRRepo(makeContext({ecr: mockEcr}));
    expect(createEcrRepo).not.toHaveBeenCalled();
  });

  it("creates the repo when it does not exist", async () => {
    vi.mocked(checkEcrRepoExists).mockResolvedValue(false);
    const ctx = makeContext({ecr: mockEcr});
    await ensureECRRepo(ctx);
    expect(createEcrRepo).toHaveBeenCalledWith(mockEcr, "my-repo");
  });

  it("throws when ecr is not set", async () => {
    const ctx = makeContext({ecr: undefined});
    await expect(ensureECRRepo(ctx)).rejects.toThrow(
      "ECRClient is required for private ECR",
    );
  });
});

describe("ensureECRRepo — public ECR", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls checkEcrPublicRepoExists with the ECRPUBLICClient and repo name", async () => {
    vi.mocked(checkEcrPublicRepoExists).mockResolvedValue(true);
    const ctx = makeContext({
      ecrPublic: mockEcrPublic,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: true,
      },
    });
    await ensureECRRepo(ctx);
    expect(checkEcrPublicRepoExists).toHaveBeenCalledWith(
      mockEcrPublic,
      "my-repo",
    );
  });

  it("does not call private checkEcrRepoExists for public ECR", async () => {
    vi.mocked(checkEcrPublicRepoExists).mockResolvedValue(true);
    const ctx = makeContext({
      ecrPublic: mockEcrPublic,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: true,
      },
    });
    await ensureECRRepo(ctx);
    expect(checkEcrRepoExists).not.toHaveBeenCalled();
  });

  it("does not create the repo when it already exists", async () => {
    vi.mocked(checkEcrPublicRepoExists).mockResolvedValue(true);
    const ctx = makeContext({
      ecrPublic: mockEcrPublic,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: true,
      },
    });
    await ensureECRRepo(ctx);
    expect(createEcrPublicRepo).not.toHaveBeenCalled();
  });

  it("creates the repo when it does not exist", async () => {
    vi.mocked(checkEcrPublicRepoExists).mockResolvedValue(false);
    const ctx = makeContext({
      ecrPublic: mockEcrPublic,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: true,
      },
    });
    await ensureECRRepo(ctx);
    expect(createEcrPublicRepo).toHaveBeenCalledWith(mockEcrPublic, "my-repo");
  });

  it("throws when ecrPublic is not set", async () => {
    const ctx = makeContext({
      ecrPublic: undefined,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: true,
      },
    });
    await expect(ensureECRRepo(ctx)).rejects.toThrow(
      "ECRPublicClient is required when --public is set",
    );
  });
});
