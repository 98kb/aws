import {describe, it, expect, vi, beforeEach} from "vitest";
import {EcrPublisher} from "../EcrPublisher";
import {ensureECRRepo} from "../ensureECRRepo";
import type {ECRClient} from "@aws-sdk/client-ecr";

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

const mockEcr = {} as ECRClient;
const BASE_OPTS = {
  repo: "my-repo",
  bump: "patch" as const,
  dockerArgs: [] as string[],
  versionPrefix: "",
  public: false,
  overrideVersion: "1.0.0",
};

describe("EcrPublisher", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets context.ecr from the constructor argument", () => {
    expect(new EcrPublisher(mockEcr).context.ecr).toBe(mockEcr);
  });

  it("does not set context.ecrPublic", () => {
    expect(new EcrPublisher(mockEcr).context.ecrPublic).toBeUndefined();
  });

  it("forces options.public to false even when caller passes true", async () => {
    await new EcrPublisher(mockEcr).publish({...BASE_OPTS, public: true});
    expect(vi.mocked(ensureECRRepo).mock.calls[0][0].options.public).toBe(
      false,
    );
  });

  it("keeps options.public as false when already false", async () => {
    await new EcrPublisher(mockEcr).publish(BASE_OPTS);
    expect(vi.mocked(ensureECRRepo).mock.calls[0][0].options.public).toBe(
      false,
    );
  });
});
