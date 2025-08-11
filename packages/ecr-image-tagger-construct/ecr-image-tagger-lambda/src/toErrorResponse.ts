import type {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
} from "aws-lambda";
import {extractOrGeneratePhysicalResourceId} from "./extractOrGeneratePhysicalResourceId";

export function toErrorResponse(
  event: CloudFormationCustomResourceEvent,
  reason: string,
): CloudFormationCustomResourceResponse {
  return {
    Status: "FAILED",
    Reason: reason,
    PhysicalResourceId: extractOrGeneratePhysicalResourceId(event),
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
  };
}
