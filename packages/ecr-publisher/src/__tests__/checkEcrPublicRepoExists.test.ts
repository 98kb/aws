import {describe, it, expect, vi, beforeEach} from "vitest";
import {DescribeRepositoriesCommand} from "@aws-sdk/client-ecr-public";
import {checkEcrPublicRepoExists} from "../checkEcrPublicRepoExists";

function makeMockClient(impl: (cmd: unknown) => unknown) {
  return {send: vi.fn().mockImplementation(impl)};
}

function namedError(name: string): Error {
  return Object.assign(new Error(`${name} message`), {name});
}

describe("checkEcrPublicRepoExists", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when DescribeRepositoriesCommand succeeds", async () => {
    const client = makeMockClient(() => Promise.resolve({repositories: []}));
    const result = await checkEcrPublicRepoExists(client as never, "my-repo");
    expect(result).toBe(true);
  });

  it("calls DescribeRepositoriesCommand with the correct repo name", async () => {
    const client = makeMockClient(() => Promise.resolve({repositories: []}));
    await checkEcrPublicRepoExists(client as never, "my-repo");
    const sentCommand = client.send.mock.calls[0][0];
    expect(sentCommand).toBeInstanceOf(DescribeRepositoriesCommand);
    expect(sentCommand.input).toEqual({repositoryNames: ["my-repo"]});
  });

  it("returns false for an error named RepositoryNotFoundException", async () => {
    const client = makeMockClient(() =>
      Promise.reject(namedError("RepositoryNotFoundException")),
    );
    const result = await checkEcrPublicRepoExists(
      client as never,
      "missing-repo",
    );
    expect(result).toBe(false);
  });

  it("rethrows any other error", async () => {
    const error = namedError("AccessDeniedException");
    const client = makeMockClient(() => Promise.reject(error));
    await expect(
      checkEcrPublicRepoExists(client as never, "my-repo"),
    ).rejects.toBe(error);
  });
});
