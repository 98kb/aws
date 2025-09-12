import z from "zod";

export const publishEcrOptionsSchema = z.object({
  region: z.string().min(2).max(100).optional(),
  repo: z.string().min(2).max(100),
  bump: z.enum(["patch", "minor", "major"]),
  dockerArgs: z.string().array().default([]),
  versionPrefix: z.string().default(""),
});
