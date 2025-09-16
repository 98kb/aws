/* eslint-disable no-console */
import semver from "semver";
import {
  type ECRClient,
  type ImageDetail,
  type DescribeImagesCommandOutput,
  DescribeImagesCommand,
} from "@aws-sdk/client-ecr";
import type {Context} from "./Context";
import {sortImagesBySemver} from "./sortImagesBySemver";

export async function toLatestImageTag({
  ecr,
  options,
}: Context): Promise<string | undefined> {
  const response = await fetchTaggedImagesFromECR(ecr, options.repo);
  const latestImage = sortImages(response.imageDetails).at(0);
  const latestTag = toImageTag(latestImage?.imageTags);
  if (latestTag === undefined) {
    console.log(`ℹ️  Repository ${options.repo} has no semver tagged images`);
  }
  return latestTag;
}

async function fetchTaggedImagesFromECR(
  ecr: ECRClient,
  repositoryName: string,
): Promise<DescribeImagesCommandOutput> {
  return ecr.send(
    new DescribeImagesCommand({
      repositoryName,
      maxResults: 1000,
      filter: {
        tagStatus: "TAGGED",
      },
    }),
  );
}

function sortImages(imageDetails: ImageDetail[] = []): ImageDetail[] {
  const taggedImages = imageDetails
    ?.filter(detail => detail.imageDigest)
    .map(detail => ({
      ...detail,
      imageDigest: detail.imageDigest!,
      imageTags: detail.imageTags ?? [],
    }));
  return sortImagesBySemver(taggedImages);
}

function toImageTag(imageTags?: ImageDetail["imageTags"]): string | undefined {
  return imageTags
    ?.filter(tag => semver.valid(tag))
    ?.sort()
    .at(0);
}
