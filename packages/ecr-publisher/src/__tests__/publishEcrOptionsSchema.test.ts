import {describe, it, expect} from "vitest";
import {publishEcrOptionsSchema} from "../publishEcrOptionsSchema";

const BASE = {repo: "my-repo", bump: "patch" as const};

describe("publishEcrOptionsSchema", () => {
  it("defaults public to false", () => {
    expect(publishEcrOptionsSchema.parse(BASE).public).toBe(false);
  });

  it("defaults alias to undefined", () => {
    expect(publishEcrOptionsSchema.parse(BASE).alias).toBeUndefined();
  });

  it("defaults dockerArgs to empty array", () => {
    expect(publishEcrOptionsSchema.parse(BASE).dockerArgs).toEqual([]);
  });

  it("defaults versionPrefix to empty string", () => {
    expect(publishEcrOptionsSchema.parse(BASE).versionPrefix).toBe("");
  });

  it("accepts public: true", () => {
    expect(publishEcrOptionsSchema.parse({...BASE, public: true}).public).toBe(
      true,
    );
  });

  it("accepts alias with public: true", () => {
    const result = publishEcrOptionsSchema.parse({
      ...BASE,
      public: true,
      alias: "myalias",
    });
    expect(result.alias).toBe("myalias");
  });

  it("accepts alias without public (alias is always optional)", () => {
    const result = publishEcrOptionsSchema.parse({...BASE, alias: "myalias"});
    expect(result.alias).toBe("myalias");
  });

  it("accepts public: true without alias", () => {
    const result = publishEcrOptionsSchema.parse({...BASE, public: true});
    expect(result.alias).toBeUndefined();
  });
});
