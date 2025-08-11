import type {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
} from "aws-lambda";

/**
 * Creates a successful CloudFormation custom resource response
 */
export function createSuccessResponse(
  event: CloudFormationCustomResourceEvent,
  physicalResourceId: string,
  data?: Record<string, string>,
): CloudFormationCustomResourceResponse {
  return {
    Status: "SUCCESS",
    PhysicalResourceId: physicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: data,
  };
}
