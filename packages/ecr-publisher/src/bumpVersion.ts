import semver from "semver";
import chalk from "chalk";
import type {Context} from "./Context";

export function bumpVersion({currentVersion, options}: Context): string {
  const newVersion = semver.inc(currentVersion, options.bump);
  if (!newVersion) {
    throw new Error(`Invalid version string: ${currentVersion}`);
  }
  // eslint-disable-next-line no-console
  console.log(
    `🔧 ${chalk.magenta("Bumping version:")} ${chalk.blueBright(currentVersion)} → ${chalk.green(options.versionPrefix + newVersion)}`,
  );
  return newVersion;
}
