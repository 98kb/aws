/* eslint-disable no-console */
import {
  type ECRClient,
  type ImageDetail,
  type DescribeImagesCommandOutput,
  DescribeImagesCommand,
} from "@aws-sdk/client-ecr";

export async function toLatestImageTag(
  ecr: ECRClient,
  repositoryName: string,
): Promise<string | undefined> {
  const response = await fetchTaggedImagesFromECR(ecr, repositoryName);
  const latestImage = sortImagesByPushDate(response.imageDetails).at(0);
  const latestTag = toImageTag(latestImage?.imageTags);
  if (latestTag) {
    console.log(`✅ Repository ${repositoryName} latest tag: ${latestTag}`);
  } else {
    console.log(`ℹ️  Repository ${repositoryName} has no tagged images`);
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
      maxResults: 100,
      filter: {
        tagStatus: "TAGGED",
      },
    }),
  );
}

function sortImagesByPushDate(imageDetails?: ImageDetail[]): ImageDetail[] {
  return (
    imageDetails
      ?.filter(image => image.imageTags && image.imageTags.length > 0)
      .sort((a, b) => {
        const dateA = a.imagePushedAt ? new Date(a.imagePushedAt).getTime() : 0;
        const dateB = b.imagePushedAt ? new Date(b.imagePushedAt).getTime() : 0;
        return dateB - dateA;
      }) ?? []
  );
}

function toImageTag(imageTags?: ImageDetail["imageTags"]): string | undefined {
  return imageTags?.sort()?.at(0);
}
