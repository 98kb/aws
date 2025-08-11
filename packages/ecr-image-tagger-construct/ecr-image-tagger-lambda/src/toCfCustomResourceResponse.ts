import type {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
} from "aws-lambda";
import {addStagingTagToEcrImage} from "./addStagingTagToEcrImage";
import type {Logger} from "./Logger";
import {toErrorResponse} from "./toErrorResponse";

export async function toCfCustomResourceResponse(
  event: CloudFormationCustomResourceEvent,
  logger: Logger,
): Promise<CloudFormationCustomResourceResponse> {
  try {
    return await addStagingTagToEcrImage(event, logger);
  } catch (error) {
    logger.error("Unexpected error in handler", error);
    return toErrorResponse(
      event,
      error instanceof Error ? error.message : "Unknown error occurred",
    );
  }
}
