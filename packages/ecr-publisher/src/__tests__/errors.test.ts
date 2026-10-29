import {describe, it, expect} from "vitest";
import {
  CommandFailedError,
  ConfirmationRequiredError,
  DigestNotFoundError,
  EcrPublisherError,
  PublishCancelledError,
  RepositoryMissingError,
  isEcrPublisherError,
} from "../errors";

describe("typed errors", () => {
  it.each([
    [
      new ConfirmationRequiredError("build"),
      "ConfirmationRequiredError",
      "CONFIRMATION_REQUIRED",
    ],
    [new PublishCancelledError("push"), "PublishCancelledError", "CANCELLED"],
    [
      new RepositoryMissingError("my-repo"),
      "RepositoryMissingError",
      "REPO_MISSING",
    ],
    [
      new DigestNotFoundError("repo:1.0.0"),
      "DigestNotFoundError",
      "DIGEST_NOT_FOUND",
    ],
    [
      new CommandFailedError({command: "docker push x", exitCode: 1}),
      "CommandFailedError",
      "COMMAND_FAILED",
    ],
  ] as const)("%s has its class name and stable code", (error, name, code) => {
    expect(error).toBeInstanceOf(EcrPublisherError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(name);
    expect(error.code).toBe(code);
  });

  it("RepositoryMissingError carries the repo", () => {
    const error = new RepositoryMissingError("my-repo");
    expect(error.repo).toBe("my-repo");
    expect(error.message).toContain("my-repo");
  });

  it("DigestNotFoundError carries the image tag", () => {
    const error = new DigestNotFoundError("acct.dkr.ecr/repo:1.0.0");
    expect(error.imageTag).toBe("acct.dkr.ecr/repo:1.0.0");
    expect(error.message).toContain("acct.dkr.ecr/repo:1.0.0");
  });

  it("CommandFailedError carries the command and exit code", () => {
    const error = new CommandFailedError({
      command: "docker build .",
      exitCode: 2,
    });
    expect(error.command).toBe("docker build .");
    expect(error.exitCode).toBe(2);
    expect(error.message).toContain("docker build .");
    expect(error.message).toContain("2");
  });

  it("CommandFailedError carries the spawn error code", () => {
    const error = new CommandFailedError({
      command: "docker push x",
      errorCode: "ENOENT",
    });
    expect(error.errorCode).toBe("ENOENT");
    expect(error.message).toContain("ENOENT");
  });
});

describe("isEcrPublisherError", () => {
  it("matches a plain object carrying a known code and name", () => {
    const foreign = {name: "PublishCancelledError", code: "CANCELLED"};
    expect(isEcrPublisherError(foreign)).toBe(true);
    expect(isEcrPublisherError(foreign, "CANCELLED")).toBe(true);
  });

  it("returns false when the code does not match the requested code", () => {
    const foreign = {name: "PublishCancelledError", code: "CANCELLED"};
    expect(isEcrPublisherError(foreign, "REPO_MISSING")).toBe(false);
  });

  it("returns false for an unrelated Error", () => {
    expect(isEcrPublisherError(new Error("boom"))).toBe(false);
  });

  it("returns false for errors with foreign codes and non-objects", () => {
    expect(
      isEcrPublisherError(Object.assign(new Error("x"), {code: "ENOENT"})),
    ).toBe(false);
    expect(isEcrPublisherError(undefined)).toBe(false);
    expect(isEcrPublisherError("CANCELLED")).toBe(false);
  });

  it("matches real instances", () => {
    expect(
      isEcrPublisherError(new RepositoryMissingError("r"), "REPO_MISSING"),
    ).toBe(true);
  });
});
