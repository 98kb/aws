import semver from "semver";
import type {EcrImageInfo} from "./EcrImageInfo";

interface VersionInfo {
  baseVersion: string;
  hotfixNumber: number;
}

export function sortImagesBySemver(images: EcrImageInfo[]): EcrImageInfo[] {
  return images.sort(compareBySemverTags);
}

function compareBySemverTags(a: EcrImageInfo, b: EcrImageInfo): number {
  const aVersionInfo = getHighestVersionInfo(a.imageTags);
  const bVersionInfo = getHighestVersionInfo(b.imageTags);

  return compareVersionInfo(aVersionInfo, bVersionInfo);
}

function getHighestVersionInfo(tags: string[]): VersionInfo | null {
  const versionInfos = tags
    .map(tag => parseVersionInfo(tag))
    .filter(info => info !== null);

  if (versionInfos.length === 0) {
    return null;
  }

  return versionInfos.sort(compareVersionInfo)[0]!;
}

function parseVersionInfo(tag: string): VersionInfo | null {
  // Remove version prefix if present
  // TODO: Make prefix configurable
  const cleanTag = tag.startsWith("v") ? tag.slice(1) : tag;

  return extractVersionInfo(cleanTag);
}

function extractVersionInfo(cleanTag: string): VersionInfo | null {
  const hotfixMatch = cleanTag.match(/^(\d+\.\d+\.\d+)\.hf(\d+)$/);

  if (hotfixMatch) {
    const [, baseVersion, hotfixNumber] = hotfixMatch;
    return {
      baseVersion,
      hotfixNumber: parseInt(hotfixNumber, 10),
    };
  }

  if (semver.valid(cleanTag)) {
    return {
      baseVersion: cleanTag,
      hotfixNumber: 0,
    };
  }

  return null;
}

function compareVersionInfo(
  a: VersionInfo | null,
  b: VersionInfo | null,
): number {
  if (!a && !b) {
    return 0;
  }

  return handleNullVersionInfo(a, b);
}

function handleNullVersionInfo(
  a: VersionInfo | null,
  b: VersionInfo | null,
): number {
  if (!a) {
    return 1;
  }
  if (!b) {
    return -1;
  }

  return compareVersionInfoValues(a, b);
}

function compareVersionInfoValues(a: VersionInfo, b: VersionInfo): number {
  const baseCompare = semver.rcompare(a.baseVersion, b.baseVersion);

  if (baseCompare !== 0) {
    return baseCompare;
  }

  return compareHotfixNumbers(a.hotfixNumber, b.hotfixNumber);
}

function compareHotfixNumbers(aHotfix: number, bHotfix: number): number {
  return bHotfix - aHotfix;
}
