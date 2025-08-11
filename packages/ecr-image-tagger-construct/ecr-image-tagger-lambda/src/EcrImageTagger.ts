import {
  type ECRClient,
  DescribeImagesCommand,
  BatchGetImageCommand,
  PutImageCommand,
  ImageNotFoundException,
  type PutImageCommandOutput,
  type DescribeImagesCommandOutput,
  type ImageDetail,
  type BatchGetImageCommandOutput,
  type Image,
} from "@aws-sdk/client-ecr";
import type {Logger} from "./Logger";
import type {EcrTaggingResult} from "./EcrTaggingResult";

/**
 * Service class for tagging ECR images with stage-specific tags.
 *
 * This service provides functionality to tag existing ECR images with stage-specific tags
 * (e.g., 'dev', 'uat', 'prod') by copying the image manifest from a source tag to a new stage tag.
 * The service handles the complete workflow of retrieving image manifests and applying new tags
 * while maintaining proper error handling and logging.
 *
 * @example
 * ```typescript
 * const tagger = new EcrImageTagger(ecrClient, logger);
 * const result = await tagger.tagImageWithStage(
 *   'my-repository',
 *   'v1.2.3',
 *   'prod'
 * );
 * console.log(`Tagged image ${result.ImageDigest} with ${result.StageTag}`);
 * ```
 *
 * @throws {Error} When the source image tag is not found in the repository
 * @throws {Error} When the image manifest cannot be retrieved
 * @throws {Error} When the image cannot be tagged with the new stage tag
 */
export class EcrImageTagger {
  constructor(
    private readonly ecrClient: ECRClient,
    private readonly logger: Logger,
  ) {}

  async tagImageWithStage(
    repositoryName: string,
    sourceImageTag: string,
    stageTag: string,
  ): Promise<EcrTaggingResult> {
    this.logger.info("Starting ECR image tagging", {
      repositoryName,
      sourceImageTag,
      stageTag,
    });

    const sourceImageDigest = await this.getImageDigest(
      repositoryName,
      sourceImageTag,
    );

    return await this.processImageTagging(
      repositoryName,
      sourceImageTag,
      stageTag,
      sourceImageDigest,
    );
  }

  private async getImageDigest(
    repositoryName: string,
    imageTag: string,
  ): Promise<string> {
    const describeResponse = await this.ecrClient.send(
      new DescribeImagesCommand({
        repositoryName,
        imageIds: [{imageTag}],
      }),
    );

    return this.extractDigestFromResponse(
      describeResponse,
      imageTag,
      repositoryName,
    );
  }

  private extractDigestFromResponse(
    describeResponse: DescribeImagesCommandOutput,
    imageTag: string,
    repositoryName: string,
  ): string {
    const imageDetail = describeResponse.imageDetails?.[0];
    this.validateImageDetail(imageDetail, imageTag, repositoryName);

    this.logFoundImage(repositoryName, imageTag, imageDetail!.imageDigest!);
    return imageDetail!.imageDigest!;
  }

  private validateImageDetail(
    imageDetail: ImageDetail | undefined,
    imageTag: string,
    repositoryName: string,
  ): void {
    if (!imageDetail?.imageDigest) {
      throw new Error(
        `No image found with tag ${imageTag} in repository ${repositoryName}`,
      );
    }
  }

  private logFoundImage(
    repositoryName: string,
    imageTag: string,
    imageDigest: string,
  ): void {
    this.logger.info("Found image", {
      repositoryName,
      imageTag,
      imageDigest,
    });
  }

  private async processImageTagging(
    repositoryName: string,
    sourceImageTag: string,
    stageTag: string,
    sourceImageDigest: string,
  ): Promise<EcrTaggingResult> {
    if (
      await this.tagAlreadyExistsOnImage(
        repositoryName,
        stageTag,
        sourceImageDigest,
      )
    ) {
      return this.createSkippedTaggingResult(
        repositoryName,
        sourceImageTag,
        stageTag,
        sourceImageDigest,
      );
    }

    return await this.performImageTagging(
      repositoryName,
      sourceImageTag,
      stageTag,
      sourceImageDigest,
    );
  }

  private createSkippedTaggingResult(
    repositoryName: string,
    sourceImageTag: string,
    stageTag: string,
    sourceImageDigest: string,
  ): EcrTaggingResult {
    this.logger.info("Tag already exists on the image, skipping tagging", {
      repositoryName,
      sourceImageTag,
      stageTag,
      imageDigest: sourceImageDigest,
    });

    return {
      ImageDigest: sourceImageDigest,
      StageTag: stageTag,
      RepositoryName: repositoryName,
    };
  }

  private async performImageTagging(
    repositoryName: string,
    sourceImageTag: string,
    stageTag: string,
    sourceImageDigest: string,
  ): Promise<EcrTaggingResult> {
    const imageManifest = await this.fetchImageManifest(
      repositoryName,
      sourceImageDigest,
    );

    const result = await this.putImageWithTag(
      repositoryName,
      stageTag,
      imageManifest,
    );

    this.logger.info("ECR image tagging completed", {
      repositoryName,
      sourceImageTag,
      stageTag,
      imageDigest: result.ImageDigest,
    });

    return {
      ImageDigest: result.ImageDigest!,
      StageTag: stageTag,
      RepositoryName: repositoryName,
    };
  }

  private async tagAlreadyExistsOnImage(
    repositoryName: string,
    stageTag: string,
    expectedImageDigest: string,
  ): Promise<boolean> {
    try {
      const describeResponse = await this.describeImageByTag(
        repositoryName,
        stageTag,
      );
      return this.checkImageDigestMatch(describeResponse, expectedImageDigest);
    } catch (error) {
      return this.handleTagExistenceCheckError(error);
    }
  }

  private async describeImageByTag(
    repositoryName: string,
    stageTag: string,
  ): Promise<DescribeImagesCommandOutput> {
    return await this.ecrClient.send(
      new DescribeImagesCommand({
        repositoryName,
        imageIds: [{imageTag: stageTag}],
      }),
    );
  }

  private checkImageDigestMatch(
    describeResponse: DescribeImagesCommandOutput,
    expectedImageDigest: string,
  ): boolean {
    const imageDetail = describeResponse.imageDetails?.[0];
    return imageDetail?.imageDigest === expectedImageDigest;
  }

  private handleTagExistenceCheckError(error: unknown): boolean {
    if (error instanceof ImageNotFoundException) {
      return false;
    }
    this.logger.error(
      "Error checking if tag exists, proceeding with tagging",
      error,
    );
    return false;
  }

  private async getImageManifest(
    repositoryName: string,
    imageTag: string,
  ): Promise<string> {
    try {
      const imageDigest = await this.getImageDigest(repositoryName, imageTag);
      return await this.fetchImageManifest(repositoryName, imageDigest);
    } catch (error) {
      return this.handleGetManifestError(error, imageTag, repositoryName);
    }
  }

  private async fetchImageManifest(
    repositoryName: string,
    imageDigest: string,
  ): Promise<string> {
    const batchGetResponse = await this.ecrClient.send(
      new BatchGetImageCommand({
        repositoryName,
        imageIds: [{imageDigest}],
      }),
    );

    return this.extractManifestFromResponse(batchGetResponse, imageDigest);
  }

  private extractManifestFromResponse(
    batchGetResponse: BatchGetImageCommandOutput,
    imageDigest: string,
  ): string {
    const image = batchGetResponse.images?.[0];
    this.validateImageManifest(image, imageDigest);
    return image!.imageManifest!;
  }

  private validateImageManifest(
    image: Image | undefined,
    imageDigest: string,
  ): void {
    if (!image?.imageManifest) {
      throw new Error(`No manifest found for image with digest ${imageDigest}`);
    }
  }

  private handleGetManifestError(
    error: unknown,
    imageTag: string,
    repositoryName: string,
  ): never {
    if (error instanceof ImageNotFoundException) {
      throw new Error(
        `Image with tag ${imageTag} not found in repository ${repositoryName}`,
      );
    }
    this.logger.error("Failed to get image manifest", error);
    throw error;
  }

  private async putImageWithTag(
    repositoryName: string,
    imageTag: string,
    imageManifest: string,
  ): Promise<{ImageDigest: string}> {
    try {
      const putResponse = await this.sendPutImageCommand(
        repositoryName,
        imageTag,
        imageManifest,
      );
      return this.extractImageDigest(putResponse, repositoryName, imageTag);
    } catch (error) {
      this.logger.error("Failed to put image with tag", error);
      throw error;
    }
  }

  private async sendPutImageCommand(
    repositoryName: string,
    imageTag: string,
    imageManifest: string,
  ): Promise<PutImageCommandOutput> {
    return await this.ecrClient.send(
      new PutImageCommand({
        repositoryName,
        imageTag,
        imageManifest,
      }),
    );
  }

  private extractImageDigest(
    putResponse: PutImageCommandOutput,
    repositoryName: string,
    imageTag: string,
  ): {ImageDigest: string} {
    const imageDigest = this.validateImageDigest(putResponse);
    this.logSuccessfulTag(repositoryName, imageTag, imageDigest);
    return {ImageDigest: imageDigest};
  }

  private validateImageDigest(putResponse: PutImageCommandOutput): string {
    const imageDigest = putResponse.image?.imageId?.imageDigest;
    this.ensureImageDigestExists(imageDigest);
    return imageDigest!;
  }

  private ensureImageDigestExists(imageDigest: string | undefined): void {
    if (!imageDigest) {
      throw new Error("Failed to get image digest from put response");
    }
  }

  private logSuccessfulTag(
    repositoryName: string,
    imageTag: string,
    imageDigest: string,
  ): void {
    this.logger.info("Successfully tagged image", {
      repositoryName,
      imageTag,
      imageDigest,
    });
  }
}
