import {describe, it, expect, vi, beforeEach} from "vitest";
import {DescribeImagesCommand} from "@aws-sdk/client-ecr";
import {DescribeImagesCommand as DescribePublicImagesCommand} from "@aws-sdk/client-ecr-public";
import type {Context} from "../Context";
import {toLatestImageTag} from "../toLatestImageTag";

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

const IMAGE_DETAILS_MULTI = [
  {imageDigest: "sha:a", imageTags: ["1.2.0"]},
  {imageDigest: "sha:b", imageTags: ["1.0.0"]},
  {imageDigest: "sha:c", imageTags: ["1.1.0"]},
];

describe("toLatestImageTag — private ECR", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls DescribeImagesCommand on the ECRClient", async () => {
    const send = vi.fn().mockResolvedValue({imageDetails: IMAGE_DETAILS_MULTI});
    const ctx = makeContext({ecr: {send} as never});
    await toLatestImageTag(ctx);
    expect(send.mock.calls[0][0]).toBeInstanceOf(DescribeImagesCommand);
  });

  it("returns the latest semver tag", async () => {
    const send = vi.fn().mockResolvedValue({imageDetails: IMAGE_DETAILS_MULTI});
    const ctx = makeContext({ecr: {send} as never});
    expect(await toLatestImageTag(ctx)).toBe("1.2.0");
  });

  it("returns undefined when there are no tagged images", async () => {
    const send = vi.fn().mockResolvedValue({imageDetails: []});
    const ctx = makeContext({ecr: {send} as never});
    expect(await toLatestImageTag(ctx)).toBeUndefined();
  });

  it("returns undefined when imageDetails has no semver tags", async () => {
    const send = vi.fn().mockResolvedValue({
      imageDetails: [{imageDigest: "sha:a", imageTags: ["not-a-version"]}],
    });
    const ctx = makeContext({ecr: {send} as never});
    expect(await toLatestImageTag(ctx)).toBeUndefined();
  });

  it("throws when ecr is not set", async () => {
    const ctx = makeContext({ecr: undefined});
    await expect(toLatestImageTag(ctx)).rejects.toThrow(
      "ECRClient is required for private ECR",
    );
  });

  it("does not call the public ECR client", async () => {
    const privateSend = vi.fn().mockResolvedValue({imageDetails: []});
    const publicSend = vi.fn();
    const ctx = makeContext({
      ecr: {send: privateSend} as never,
      ecrPublic: {send: publicSend} as never,
    });
    await toLatestImageTag(ctx);
    expect(publicSend).not.toHaveBeenCalled();
  });
});

describe("toLatestImageTag — public ECR", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls DescribeImagesCommand on the ECRPUBLICClient", async () => {
    const send = vi.fn().mockResolvedValue({imageDetails: IMAGE_DETAILS_MULTI});
    const ctx = makeContext({
      ecrPublic: {send} as never,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: true,
      },
    });
    await toLatestImageTag(ctx);
    expect(send.mock.calls[0][0]).toBeInstanceOf(DescribePublicImagesCommand);
  });

  it("returns the latest semver tag", async () => {
    const send = vi.fn().mockResolvedValue({imageDetails: IMAGE_DETAILS_MULTI});
    const ctx = makeContext({
      ecrPublic: {send} as never,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: true,
      },
    });
    expect(await toLatestImageTag(ctx)).toBe("1.2.0");
  });

  it("returns undefined when there are no tagged images", async () => {
    const send = vi.fn().mockResolvedValue({imageDetails: []});
    const ctx = makeContext({
      ecrPublic: {send} as never,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: true,
      },
    });
    expect(await toLatestImageTag(ctx)).toBeUndefined();
  });

  it("returns undefined when imageDetails has no semver tags", async () => {
    const send = vi.fn().mockResolvedValue({
      imageDetails: [{imageDigest: "sha:a", imageTags: ["not-a-version"]}],
    });
    const ctx = makeContext({
      ecrPublic: {send} as never,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: true,
      },
    });
    expect(await toLatestImageTag(ctx)).toBeUndefined();
  });

  it("does not call the private ECR client", async () => {
    const privateSend = vi.fn();
    const publicSend = vi.fn().mockResolvedValue({imageDetails: []});
    const ctx = makeContext({
      ecr: {send: privateSend} as never,
      ecrPublic: {send: publicSend} as never,
      options: {
        repo: "my-repo",
        bump: "patch",
        dockerArgs: [],
        versionPrefix: "",
        public: true,
      },
    });
    await toLatestImageTag(ctx);
    expect(privateSend).not.toHaveBeenCalled();
  });
});
