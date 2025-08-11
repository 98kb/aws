export type Options = {
  region?: string;
  repo: string;
  bump: "patch" | "minor" | "major";
  dryRun?: boolean;
  dockerArgs?: string[];
  context?: string;
};
