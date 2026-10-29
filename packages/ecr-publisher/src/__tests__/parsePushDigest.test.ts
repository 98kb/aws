import {describe, it, expect} from "vitest";
import {parsePushDigest} from "../parsePushDigest";

const FIRST = `sha256:${"a".repeat(64)}`;
const SECOND = `sha256:${"0123456789abcdef".repeat(4)}`;

function pushLine(digest: string): string {
  return `1.3.0: digest: ${digest} size: 1573`;
}

describe("parsePushDigest", () => {
  it("returns the digest from a single match", () => {
    const stdout = ["abc123: Pushed", pushLine(FIRST)].join("\n");
    expect(parsePushDigest(stdout)).toBe(FIRST);
  });

  it("returns the last digest when there are two matches", () => {
    const stdout = [pushLine(FIRST), "def456: Pushed", pushLine(SECOND)].join(
      "\n",
    );
    expect(parsePushDigest(stdout)).toBe(SECOND);
  });

  it("does not match uppercase hex", () => {
    expect(parsePushDigest(pushLine(`sha256:${"A".repeat(64)}`))).toBe(
      undefined,
    );
  });

  it("does not match a 63-character hash", () => {
    expect(parsePushDigest(pushLine(`sha256:${"a".repeat(63)}`))).toBe(
      undefined,
    );
  });

  it("returns undefined for empty output", () => {
    expect(parsePushDigest("")).toBe(undefined);
  });
});
