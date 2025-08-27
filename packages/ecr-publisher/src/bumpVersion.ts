import semver from "semver";
import chalk from "chalk";
import type {BumpType} from "./BumpType";

export function bumpVersion(version: string, bumpType: BumpType): string {
  const newVersion = semver.inc(version, bumpType);
  if (!newVersion) {
    throw new Error(`Invalid version string: ${version}`);
  }
  // eslint-disable-next-line no-console
  console.log(
    `🔧 ${chalk.yellow("Bumping version:")} ${chalk.blueBright(version)} → ${chalk.green(newVersion)}`,
  );
  return newVersion;
}
