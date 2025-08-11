import {ECRClient} from "@aws-sdk/client-ecr";
import type {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
} from "aws-lambda";
import {EcrImageTagger} from "./EcrImageTagger";
import type {Logger} from "./Logger";
import type {EcrTaggingProperties} from "./EcrTaggingProperties";
import {createSuccessResponse} from "./createSuccessResponse";
import {toErrorResponse} from "./toErrorResponse";
import {extractOrGeneratePhysicalResourceId} from "./extractOrGeneratePhysicalResourceId";

export async function addStagingTagToEcrImage(
  event: CloudFormationCustomResourceEvent,
  logger: Logger,
): Promise<CloudFormationCustomResourceResponse> {
  if (event.RequestType === "Delete") {
    logger.info("Processing Delete request - no action required");
    return createSuccessResponse(
      event,
      extractOrGeneratePhysicalResourceId(event),
    );
  }

  logger.info("Processing Create/Update request - performing ECR tagging");
  return await tryTaggingEcrImage(event, logger);
}

async function tryTaggingEcrImage(
  event: CloudFormationCustomResourceEvent,
  logger: Logger,
): Promise<CloudFormationCustomResourceResponse> {
  try {
    return await tagEcrImage(event, logger);
  } catch (error) {
    logger.error("Error in ECR tagging", error);
    return toErrorResponse(
      event,
      error instanceof Error ? error.message : "Unknown error occurred",
    );
  }
}

async function tagEcrImage(
  event: CloudFormationCustomResourceEvent,
  logger: Logger,
): Promise<CloudFormationCustomResourceResponse> {
  const props = event.ResourceProperties as unknown as EcrTaggingProperties;

  logger.info("Starting ECR image tagging", {
    repositoryName: props.repositoryName,
    imageTag: props.imageTag,
    stageTag: props.stageTag,
    region: props.region,
  });

  const tagger = new EcrImageTagger(
    new ECRClient({region: props.region}),
    logger,
  );

  const result = await tagger.tagImageWithStage(
    props.repositoryName,
    props.imageTag,
    props.stageTag,
  );

  const physicalResourceId = `ecr-tagger-${props.repositoryName}-${props.stageTag}-${Date.now()}`;

  logger.info("ECR image tagging completed successfully", {
    physicalResourceId,
    result,
  });

  return createSuccessResponse(event, physicalResourceId, {
    ImageDigest: result.ImageDigest,
    StageTag: result.StageTag,
    RepositoryName: result.RepositoryName,
  });
}
