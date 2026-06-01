/* eslint-disable no-console */
import semver from "semver";
import {
  type ECRClient,
  type ImageDetail,
  type DescribeImagesCommandOutput,
  DescribeImagesCommand,
} from "@aws-sdk/client-ecr";
import {
  type ECRPUBLICClient,
  type ImageDetail as PublicImageDetail,
  type DescribeImagesCommandOutput as DescribePublicImagesCommandOutput,
  DescribeImagesCommand as DescribePublicImagesCommand,
} from "@aws-sdk/client-ecr-public";
import type {Context} from "./Context";
import {sortImagesBySemver} from "./sortImagesBySemver";

export async function toLatestImageTag({
  ecr,
  ecrPublic,
  options,
}: Context): Promise<string | undefined> {
  if (options.public) {
    return toLatestPublicImageTag(ecrPublic!, options.repo);
  }
  if (!ecr) throw new Error("ECRClient is required for private ECR");
  return toLatestPrivateImageTag(ecr, options.repo);
}

async function toLatestPublicImageTag(
  ecrPublic: ECRPUBLICClient,
  repositoryName: string,
): Promise<string | undefined> {
  const response = await fetchTaggedImagesFromPublicECR(
    ecrPublic,
    repositoryName,
  );
  const taggedImages = sortImages(response.imageDetails as PublicImageDetail[]);
  const latestTag = toImageTag(taggedImages.at(0)?.imageTags);
  if (latestTag === undefined) {
    console.log(`ℹ️  Repository ${repositoryName} has no semver tagged images`);
  }
  return latestTag;
}

async function toLatestPrivateImageTag(
  ecr: ECRClient,
  repositoryName: string,
): Promise<string | undefined> {
  const response = await fetchTaggedImagesFromECR(ecr, repositoryName);
  const latestImage = sortImages(response.imageDetails).at(0);
  const latestTag = toImageTag(latestImage?.imageTags);
  if (latestTag === undefined) {
    console.log(`ℹ️  Repository ${repositoryName} has no semver tagged images`);
  }
  return latestTag;
}

async function fetchTaggedImagesFromPublicECR(
  ecrPublic: ECRPUBLICClient,
  repositoryName: string,
): Promise<DescribePublicImagesCommandOutput> {
  return ecrPublic.send(
    new DescribePublicImagesCommand({
      repositoryName,
      maxResults: 1000,
    }),
  );
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
