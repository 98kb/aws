import type {CloudFormationCustomResourceEvent, Context} from "aws-lambda";
import {Logger} from "./Logger";
import {notifyCloudFormation} from "./notifyCloudFormation";
import {toCfCustomResourceResponse} from "./toCfCustomResourceResponse";

/**
 * AWS Lambda handler for CloudFormation custom resource that manages ECR image tagging.
 *
 * This handler processes CloudFormation custom resource events to tag ECR images with
 * stage-specific tags (e.g., DEV, UAT, PROD). It supports Create, Update, and Delete
 * operations from CloudFormation stacks.
 *
 * For Create/Update requests: Tags the specified ECR image with the provided stage tag
 * For Delete requests: Returns success without performing any action (tags remain)
 *
 * @param event - CloudFormation custom resource event containing repository name, image tag, stage tag, and region
 * @param context - AWS Lambda context object
 */
export const handler = async (
  event: CloudFormationCustomResourceEvent,
  context: Context,
): Promise<void> => {
  const logger = new Logger();
  logger.info("Lambda execution started", {event, context});

  const response = await toCfCustomResourceResponse(event, logger);
  await notifyCloudFormation(event, response, logger);
};
