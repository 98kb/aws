import {describe, it, expect, vi, beforeEach} from "vitest";
import {PublicEcrPublisher} from "../PublicEcrPublisher";
import {ensureECRRepo} from "../ensureECRRepo";
import type {ECRPUBLICClient} from "@aws-sdk/client-ecr-public";

vi.mock("../ensureECRRepo", () => ({
  ensureECRRepo: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../toLatestImageTag", () => ({
  toLatestImageTag: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../bumpVersion", () => ({
  bumpVersion: vi.fn().mockReturnValue("1.1.0"),
}));
vi.mock("../buildDockerImage", () => ({
  buildDockerImage: vi.fn().mockResolvedValue("my-repo:1.1.0"),
}));
vi.mock("../uploadImageToECR", () => ({
  uploadImageToECR: vi.fn().mockResolvedValue("my-repo:1.1.0"),
}));

const mockEcrPublic = {} as ECRPUBLICClient;
const BASE_OPTS = {
  repo: "my-repo",
  bump: "patch" as const,
  dockerArgs: [] as string[],
  versionPrefix: "",
  public: false,
  overrideVersion: "1.0.0",
};

describe("PublicEcrPublisher", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets context.ecrPublic from the constructor argument", () => {
    expect(new PublicEcrPublisher(mockEcrPublic).context.ecrPublic).toBe(
      mockEcrPublic,
    );
  });

  it("does not set context.ecr", () => {
    expect(new PublicEcrPublisher(mockEcrPublic).context.ecr).toBeUndefined();
  });

  it("forces options.public to true even when caller passes false", async () => {
    await new PublicEcrPublisher(mockEcrPublic).publish({
      ...BASE_OPTS,
      public: false,
    });
    expect(vi.mocked(ensureECRRepo).mock.calls[0][0].options.public).toBe(true);
  });

  it("keeps options.public as true when already true", async () => {
    await new PublicEcrPublisher(mockEcrPublic).publish({
      ...BASE_OPTS,
      public: true,
    });
    expect(vi.mocked(ensureECRRepo).mock.calls[0][0].options.public).toBe(true);
  });
});
