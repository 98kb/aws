import semver from "semver";
import type {BumpType} from "./BumpType";

export function bumpVersion(version: string, bumpType: BumpType): string {
  const newVersion = semver.inc(version, bumpType);
  if (!newVersion) {
    throw new Error(`Invalid version string: ${version}`);
  }
  return newVersion;
}
